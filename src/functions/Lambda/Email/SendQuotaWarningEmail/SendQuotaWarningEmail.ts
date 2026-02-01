import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { quotaWarningHtml } from "../../../../email/html/quotaWarning/quotaWarning";
import type {
  SendQuotaWarningEmailDependencies,
  SendQuotaWarningEmailEvent,
} from "./SendQuotaWarningEmail.types";
import { SendQuotaWarningEmailDetailSchema } from "./SendQuotaWarningEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendQuotaWarningEmail =
  (dependencies: SendQuotaWarningEmailDependencies) =>
  async (event: SendQuotaWarningEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendQuotaWarningEmail",
    };

    let detail: z.infer<typeof SendQuotaWarningEmailDetailSchema>;
    try {
      detail = SendQuotaWarningEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendQuotaWarningEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendQuotaWarningEmail payload");
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeUpgradeUrl = sanitizeUrl(
      detail.upgradeUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = `You've used ${Math.round(detail.percentUsed)}% of your CDK Insights quota`;
    const htmlBody = quotaWarningHtml(
      displayName,
      detail.usedResources,
      detail.totalResources,
      detail.percentUsed,
      detail.resetDate,
      detail.upgradeUrl
    );
    const textBody = `Hi ${displayName},

You've used ${detail.usedResources.toLocaleString()} of your ${detail.totalResources.toLocaleString()} AI analysis resources (${Math.round(detail.percentUsed)}%).

Your quota will reset on ${detail.resetDate}.

Upgrade for unlimited access: ${safeUpgradeUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending quota warning email", {
      ...context,
      to: detail.customerEmail,
      percentUsed: detail.percentUsed,
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

    logger.success("Quota warning email sent", {
      ...context,
      to: detail.customerEmail,
    });
  };
