import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { feedbackRequestHtml } from "../../../../email/html/feedbackRequest/feedbackRequest";
import type {
  SendFeedbackRequestEmailDependencies,
  SendFeedbackRequestEmailEvent,
} from "./SendFeedbackRequestEmail.types";
import { SendFeedbackRequestEmailDetailSchema } from "./SendFeedbackRequestEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendFeedbackRequestEmail =
  (dependencies: SendFeedbackRequestEmailDependencies) =>
  async (event: SendFeedbackRequestEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendFeedbackRequestEmail",
    };

    let detail: z.infer<typeof SendFeedbackRequestEmailDetailSchema>;
    try {
      detail = SendFeedbackRequestEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendFeedbackRequestEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendFeedbackRequestEmail payload");
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

    const safeFeedbackUrl = sanitizeUrl(
      detail.feedbackUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = "We'd love your feedback - CDK Insights";
    const htmlBody = feedbackRequestHtml(
      displayName,
      detail.totalScans,
      detail.feedbackUrl
    );
    const textBody = `Hi ${displayName},

You've run ${detail.totalScans} scans with CDK Insights. We'd love to hear what you think!

Your feedback shapes the future of CDK Insights. Share your experience in a quick 2-minute survey.

We'd love to know:
- What features do you use most?
- What would make CDK Insights even better?
- Would you recommend us to a colleague?

Share your feedback: ${safeFeedbackUrl}

Prefer to email us directly? Reach out to feedback@cdkinsights.dev

Thank you for being part of the CDK Insights community!
`;

    logger.info("Sending feedback request email", {
      ...context,
      to: detail.customerEmail,
      totalScans: detail.totalScans,
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

    logger.success("Feedback request email sent", {
      ...context,
      to: detail.customerEmail,
    });
  };
