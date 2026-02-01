import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { featureAnnouncementHtml } from "../../../../email/html/featureAnnouncement/featureAnnouncement";
import type {
  SendFeatureAnnouncementEmailDependencies,
  SendFeatureAnnouncementEmailEvent,
} from "./SendFeatureAnnouncementEmail.types";
import { SendFeatureAnnouncementEmailDetailSchema } from "./SendFeatureAnnouncementEmail.types";
import {
  sanitizeUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../../shared/utils/htmlSanitizer";

export const sendFeatureAnnouncementEmail =
  (dependencies: SendFeatureAnnouncementEmailDependencies) =>
  async (event: SendFeatureAnnouncementEmailEvent): Promise<void> => {
    const { sesClient, logger, config } = dependencies;
    const context = {
      requestId: event.id,
      functionName: "sendFeatureAnnouncementEmail",
    };

    let detail: z.infer<typeof SendFeatureAnnouncementEmailDetailSchema>;
    try {
      detail = SendFeatureAnnouncementEmailDetailSchema.parse(event.detail);
    } catch (error) {
      logger.error("Invalid SendFeatureAnnouncementEmail payload", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Invalid SendFeatureAnnouncementEmail payload");
    }

    const displayName =
      detail.customerName?.trim() ||
      detail.customerEmail.split("@")[0] ||
      "there";

    const safeLearnMoreUrl = sanitizeUrl(
      detail.learnMoreUrl,
      CDK_INSIGHTS_ALLOWED_DOMAINS
    );

    const subject = `${detail.announcementTitle} - CDK Insights`;
    const htmlBody = featureAnnouncementHtml(
      displayName,
      detail.announcementTitle,
      detail.announcementDescription,
      detail.features,
      detail.learnMoreUrl
    );

    const featuresText = detail.features
      .map((f) => `  - ${f.title}: ${f.description}`)
      .join("\n");

    const textBody = `Hi ${displayName},

${detail.announcementDescription}

What's new:
${featuresText}

Learn more: ${safeLearnMoreUrl}

If you have any questions, please contact us at support@cdkinsights.dev
`;

    logger.info("Sending feature announcement email", {
      ...context,
      to: detail.customerEmail,
      announcementTitle: detail.announcementTitle,
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

    logger.success("Feature announcement email sent", {
      ...context,
      to: detail.customerEmail,
    });
  };
