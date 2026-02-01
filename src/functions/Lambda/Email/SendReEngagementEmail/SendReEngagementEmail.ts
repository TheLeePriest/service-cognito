import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { reEngagementHtml } from "../../../../email/html/reEngagement/reEngagement";
import type {
  SendReEngagementEmailDependencies,
  SendReEngagementEmailEvent,
} from "./SendReEngagementEmail.types";
import { SendReEngagementEmailDetailSchema } from "./SendReEngagementEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendReEngagementEmail =
  (dependencies: SendReEngagementEmailDependencies) =>
  async (event: SendReEngagementEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendReEngagementEmail",
    };

    let detail: z.infer<typeof SendReEngagementEmailDetailSchema>;
    try {
      detail = SendReEngagementEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendReEngagementEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendReEngagementEmail payload");
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeDashboardUrl = sanitizeUrl(
      detail.dashboardUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = "We miss you! - CDK Insights";
    const htmlBody = reEngagementHtml(
      displayName,
      detail.daysSinceLastScan,
      detail.dashboardUrl
    );
    const textBody = `Hi ${displayName},

It's been ${detail.daysSinceLastScan} days since your last CDK Insights scan. Your infrastructure may have changed - let's make sure it's still secure and optimized.

What might have changed?
- New resources deployed to your stacks
- Configuration changes that affect security
- New AWS best practices we've added
- Cost optimization opportunities

Run a quick scan:
  npx cdk-insights scan

Or visit your dashboard: ${safeDashboardUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending re-engagement email", {
      ...context,
      to: detail.customerEmail,
      daysSinceLastScan: detail.daysSinceLastScan,
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

    logger.success("Re-engagement email sent", {
      ...context,
      to: detail.customerEmail,
    });
  };
