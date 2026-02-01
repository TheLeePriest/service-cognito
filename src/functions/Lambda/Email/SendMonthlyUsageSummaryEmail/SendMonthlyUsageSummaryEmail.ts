import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { monthlyUsageSummaryHtml } from "../../../../email/html/monthlyUsageSummary/monthlyUsageSummary";
import type {
  SendMonthlyUsageSummaryEmailDependencies,
  SendMonthlyUsageSummaryEmailEvent,
} from "./SendMonthlyUsageSummaryEmail.types";
import { SendMonthlyUsageSummaryEmailDetailSchema } from "./SendMonthlyUsageSummaryEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendMonthlyUsageSummaryEmail =
  (dependencies: SendMonthlyUsageSummaryEmailDependencies) =>
  async (event: SendMonthlyUsageSummaryEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendMonthlyUsageSummaryEmail",
    };

    let detail: z.infer<typeof SendMonthlyUsageSummaryEmailDetailSchema>;
    try {
      detail = SendMonthlyUsageSummaryEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendMonthlyUsageSummaryEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendMonthlyUsageSummaryEmail payload");
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeDashboardUrl = sanitizeUrl(
      detail.dashboardUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = `Your ${detail.month} CDK Insights Summary`;
    const htmlBody = monthlyUsageSummaryHtml(
      displayName,
      detail.month,
      detail.year,
      detail.usage,
      detail.dashboardUrl
    );

    const topServicesText = detail.usage.topServices
      .slice(0, 5)
      .map((s) => `  - ${s.name}: ${s.count} resources`)
      .join("\n");

    const textBody = `Hi ${displayName},

Here's your CDK Insights usage summary for ${detail.month} ${detail.year}.

Scans Run: ${detail.usage.totalScans}
Resources Analyzed: ${detail.usage.totalResources.toLocaleString()}
Issues Found: ${detail.usage.issuesFound}
  - Critical: ${detail.usage.criticalIssues}
  - High: ${detail.usage.highIssues}
  - Medium: ${detail.usage.mediumIssues}
  - Low: ${detail.usage.lowIssues}

${topServicesText ? `Top Services:\n${topServicesText}` : ""}

View full report: ${safeDashboardUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending monthly usage summary email", {
      ...context,
      to: detail.customerEmail,
      month: detail.month,
      year: detail.year,
    });

    const command = new SendEmailCommand({
      Source: config.fromEmail,
      Destination: {
        ToAddresses: [detail.customerEmail],
      },
      ReplyToAddresses: config.replyToEmail ? [config.replyToEmail] : undefined,
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: htmlBody, Charset: "UTF-8" },
          Text: { Data: textBody, Charset: "UTF-8" },
        },
      },
    });

    await sesClient.send(command);

    logger.success("Monthly usage summary email sent", {
      ...context,
      to: detail.customerEmail,
    });
  };
