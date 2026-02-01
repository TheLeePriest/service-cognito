import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { paymentFailedHtml } from "../../../../email/html/paymentFailed/paymentFailed";
import type {
  SendPaymentFailedEmailDependencies,
  SendPaymentFailedEmailEvent,
} from "./SendPaymentFailedEmail.types";
import { SendPaymentFailedEmailDetailSchema } from "./SendPaymentFailedEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendPaymentFailedEmail =
  (dependencies: SendPaymentFailedEmailDependencies) =>
  async (event: SendPaymentFailedEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendPaymentFailedEmail",
    };

    let detail: z.infer<typeof SendPaymentFailedEmailDetailSchema>;
    try {
      detail = SendPaymentFailedEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendPaymentFailedEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendPaymentFailedEmail payload");
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeUpdatePaymentUrl = sanitizeUrl(
      detail.updatePaymentUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = "Action Required: Payment Failed - CDK Insights";
    const htmlBody = paymentFailedHtml(
      displayName,
      detail.failureReason || "Your payment could not be processed",
      detail.retryDate || "soon",
      detail.updatePaymentUrl
    );
    const textBody = `Hi ${displayName},

We were unable to process your payment for CDK Insights.

Reason: ${detail.failureReason || "Your payment could not be processed"}

Please update your payment method here: ${safeUpdatePaymentUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending payment failed email", {
      ...context,
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

    logger.success("Payment failed email sent", {
      ...context,
      to: detail.customerEmail,
      stripeCustomerId: detail.stripeCustomerId,
    });
  };
