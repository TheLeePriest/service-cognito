import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { quotaExceededHtml } from "../../../../email/html/quotaExceeded/quotaExceeded";
import type {
  SendQuotaExceededEmailDependencies,
  SendQuotaExceededEmailEvent,
} from "./SendQuotaExceededEmail.types";
import { SendQuotaExceededEmailDetailSchema } from "./SendQuotaExceededEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendQuotaExceededEmail =
  (dependencies: SendQuotaExceededEmailDependencies) =>
  async (event: SendQuotaExceededEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendQuotaExceededEmail",
    };

    let detail: z.infer<typeof SendQuotaExceededEmailDetailSchema>;
    try {
      detail = SendQuotaExceededEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendQuotaExceededEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendQuotaExceededEmail payload");
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeUpgradeUrl = sanitizeUrl(
      detail.upgradeUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = "Quota Limit Reached - CDK Insights";
    const htmlBody = quotaExceededHtml(
      displayName,
      detail.usedResources,
      detail.totalResources,
      detail.resetDate,
      detail.upgradeUrl
    );
    const textBody = `Hi ${displayName},

You've reached your monthly AI analysis quota of ${detail.totalResources.toLocaleString()} resources.

Your quota will reset on ${detail.resetDate}. Until then:
- Static analysis checks continue to work
- CDK Nag integration continues to work
- AI-powered recommendations are paused

Upgrade for unlimited access: ${safeUpgradeUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending quota exceeded email", {
      ...context,
      to: detail.customerEmail,
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

    logger.success("Quota exceeded email sent", {
      ...context,
      to: detail.customerEmail,
    });
  };
