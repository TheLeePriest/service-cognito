import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { subscriptionCancelledHtml } from "../../../../email/html/subscriptionCancelled/subscriptionCancelled";
import type {
  SendSubscriptionCancelledEmailDependencies,
  SendSubscriptionCancelledEmailEvent,
} from "./SendSubscriptionCancelledEmail.types";
import { SendSubscriptionCancelledEmailDetailSchema } from "./SendSubscriptionCancelledEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendSubscriptionCancelledEmail =
  (dependencies: SendSubscriptionCancelledEmailDependencies) =>
  async (event: SendSubscriptionCancelledEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendSubscriptionCancelledEmail",
    };

    let detail: z.infer<typeof SendSubscriptionCancelledEmailDetailSchema>;
    try {
      detail = SendSubscriptionCancelledEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendSubscriptionCancelledEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendSubscriptionCancelledEmail payload");
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeReactivateUrl = sanitizeUrl(
      detail.reactivateUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = "Your CDK Insights subscription has been cancelled";
    const htmlBody = subscriptionCancelledHtml(
      displayName,
      detail.accessEndDate,
      detail.reactivateUrl
    );
    const textBody = `Hi ${displayName},

Your CDK Insights subscription has been cancelled.

You'll continue to have access until ${detail.accessEndDate}. After that, you'll be limited to the free tier features.

Changed your mind? Reactivate here: ${safeReactivateUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending subscription cancelled email", {
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

    logger.success("Subscription cancelled email sent", {
      ...context,
      to: detail.customerEmail,
      stripeSubscriptionId: detail.stripeSubscriptionId,
    });
  };
