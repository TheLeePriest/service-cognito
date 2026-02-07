import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { subscriptionRenewedHtml } from "../../../../email/html/subscriptionRenewed/subscriptionRenewed";
import type {
  SendSubscriptionRenewedEmailDependencies,
  SendSubscriptionRenewedEmailEvent,
} from "./SendSubscriptionRenewedEmail.types";
import { SendSubscriptionRenewedEmailDetailSchema } from "./SendSubscriptionRenewedEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendSubscriptionRenewedEmail =
  (dependencies: SendSubscriptionRenewedEmailDependencies) =>
  async (event: SendSubscriptionRenewedEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendSubscriptionRenewedEmail",
    };

    let detail: z.infer<typeof SendSubscriptionRenewedEmailDetailSchema>;
    try {
      detail = SendSubscriptionRenewedEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendSubscriptionRenewedEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendSubscriptionRenewedEmail payload");
    }

    if (dependencies.consentChecker) {
      const hasConsent = await dependencies.consentChecker(detail.customerEmail);
      if (!hasConsent) {
        logger.info("Email suppressed - user opted out", {
          ...context,
          to: detail.customerEmail,
        });
        return;
      }
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeDashboardUrl = sanitizeUrl(
      detail.dashboardUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = "Payment Received - CDK Insights";
    const htmlBody = subscriptionRenewedHtml(
      displayName,
      detail.planName,
      detail.amount,
      detail.currency,
      detail.nextRenewalDate,
      detail.dashboardUrl
    );
    const textBody = `Hi ${displayName},

Thank you for your continued support! Your CDK Insights ${detail.planName} subscription has been renewed.

Amount: ${detail.currency}${detail.amount}
Next renewal date: ${detail.nextRenewalDate}

Go to dashboard: ${safeDashboardUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending subscription renewed email", {
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

    logger.success("Subscription renewed email sent", {
      ...context,
      to: detail.customerEmail,
      stripeSubscriptionId: detail.stripeSubscriptionId,
    });
  };
