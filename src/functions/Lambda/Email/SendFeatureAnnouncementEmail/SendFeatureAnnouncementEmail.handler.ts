import { SESClient } from "@aws-sdk/client-ses";
import { env } from "../../../../shared/config/environment";
import { getLogger } from "../../../../shared/logging/logger";
import { sendFeatureAnnouncementEmail } from "./SendFeatureAnnouncementEmail";

const sesClient = new SESClient({});

const fromEmail = env.getRequired("SES_FROM_EMAIL", "SES from email");
const replyToEmail = env.get("SES_REPLY_TO_EMAIL") || undefined;

export const sendFeatureAnnouncementEmailHandler = sendFeatureAnnouncementEmail({
  sesClient,
  logger: getLogger("SendFeatureAnnouncementEmail"),
  config: {
    fromEmail,
    replyToEmail,
  },
});
