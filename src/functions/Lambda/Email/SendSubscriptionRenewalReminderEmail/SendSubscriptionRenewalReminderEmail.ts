import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { subscriptionRenewalReminderHtml } from "../../../../email/html/subscriptionRenewalReminder/subscriptionRenewalReminder";
import type {
  SendSubscriptionRenewalReminderEmailDependencies,
  SendSubscriptionRenewalReminderEmailEvent,
} from "./SendSubscriptionRenewalReminderEmail.types";
import { SendSubscriptionRenewalReminderEmailDetailSchema } from "./SendSubscriptionRenewalReminderEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendSubscriptionRenewalReminderEmail =
  (dependencies: SendSubscriptionRenewalReminderEmailDependencies) =>
  async (event: SendSubscriptionRenewalReminderEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendSubscriptionRenewalReminderEmail",
    };

    let detail: z.infer<typeof SendSubscriptionRenewalReminderEmailDetailSchema>;
    try {
      detail = SendSubscriptionRenewalReminderEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendSubscriptionRenewalReminderEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendSubscriptionRenewalReminderEmail payload");
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeManageUrl = sanitizeUrl(
      detail.manageSubscriptionUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = "Your CDK Insights subscription renews soon";
    const htmlBody = subscriptionRenewalReminderHtml(
      displayName,
      detail.renewalDate,
      detail.planName,
      detail.amount,
      detail.currency,
      detail.manageSubscriptionUrl
    );
    const textBody = `Hi ${displayName},

Your CDK Insights ${detail.planName} subscription will automatically renew on ${detail.renewalDate} for ${detail.currency}${detail.amount}.

No action is needed - your subscription will continue seamlessly.

Manage your subscription: ${safeManageUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending subscription renewal reminder email", {
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

    logger.success("Subscription renewal reminder email sent", {
      ...context,
      to: detail.customerEmail,
      stripeSubscriptionId: detail.stripeSubscriptionId,
    });
  };
