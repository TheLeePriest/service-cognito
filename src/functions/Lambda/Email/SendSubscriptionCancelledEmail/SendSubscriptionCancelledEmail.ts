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

    const subject = detail.refundProcessed
      ? "Your CDK Insights subscription has been cancelled - Refund processed"
      : "Your CDK Insights subscription has been cancelled";

    const refundInfo = detail.refundProcessed ? {
      refundProcessed: true,
      refundAmount: detail.refundAmount,
      refundCurrency: detail.refundCurrency,
      overageAmountNotRefunded: detail.overageAmountNotRefunded,
    } : undefined;

    const htmlBody = subscriptionCancelledHtml(
      displayName,
      detail.accessEndDate,
      detail.reactivateUrl,
      refundInfo
    );
    const formatCurrency = (amountInCents: number, currency: string): string => {
      const currencySymbols: Record<string, string> = {
        gbp: '£',
        usd: '$',
        eur: '€',
      };
      const symbol = currencySymbols[currency.toLowerCase()] || currency.toUpperCase() + ' ';
      return `${symbol}${(amountInCents / 100).toFixed(2)}`;
    };

    let textBody: string;
    if (detail.refundProcessed && detail.refundAmount && detail.refundCurrency) {
      const refundAmountFormatted = formatCurrency(detail.refundAmount, detail.refundCurrency);
      const overageNote = detail.overageAmountNotRefunded
        ? `\nNote: Usage-based overage charges of ${formatCurrency(detail.overageAmountNotRefunded, detail.refundCurrency)} were not included in the refund as these resources were consumed.\n`
        : '';

      textBody = `Hi ${displayName},

Your CDK Insights subscription has been cancelled and your refund is being processed.

REFUND CONFIRMED: ${refundAmountFormatted}
This refund will appear on your original payment method within 5-10 business days.
${overageNote}
Your subscription has been cancelled immediately and your account has reverted to the free tier.

Changed your mind? Resubscribe here: ${safeReactivateUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;
    } else {
      textBody = `Hi ${displayName},

Your CDK Insights subscription has been cancelled.

You'll continue to have access until ${detail.accessEndDate}. After that, you'll be limited to the free tier features.

Changed your mind? Reactivate here: ${safeReactivateUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;
    }

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
