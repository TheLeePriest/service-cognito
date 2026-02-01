import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { trialExpiredHtml } from "../../../../email/html/trialExpired/trialExpired";
import type {
  SendTrialExpiredEmailDependencies,
  SendTrialExpiredEmailEvent,
} from "./SendTrialExpiredEmail.types";
import { SendTrialExpiredEmailDetailSchema } from "./SendTrialExpiredEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendTrialExpiredEmail =
  (dependencies: SendTrialExpiredEmailDependencies) =>
  async (event: SendTrialExpiredEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendTrialExpiredEmail",
    };

    let detail: z.infer<typeof SendTrialExpiredEmailDetailSchema>;
    try {
      detail = SendTrialExpiredEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendTrialExpiredEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendTrialExpiredEmail payload");
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeUpgradeUrl = sanitizeUrl(
      detail.upgradeUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = "Your CDK Insights trial has ended";
    const htmlBody = trialExpiredHtml(displayName, detail.upgradeUrl);
    const textBody = `Hi ${displayName},

Your CDK Insights trial has ended.

During your trial, you had access to AI-powered analysis and all premium features. Don't lose access to these valuable insights!

Upgrade now: ${safeUpgradeUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending trial expired email", {
      ...context,
      stripeSubscriptionId: detail.stripeSubscriptionId,
      stripeCustomerId: detail.stripeCustomerId,
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

    logger.success("Trial expired email sent", {
      ...context,
      to: detail.customerEmail,
      stripeSubscriptionId: detail.stripeSubscriptionId,
    });
  };
