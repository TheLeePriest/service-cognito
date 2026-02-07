import { SESClient } from "@aws-sdk/client-ses";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { env } from "../../../../shared/config/environment";
import { getLogger } from "../../../../shared/logging/logger";
import { createConsentChecker } from "../../../../shared/utils/consentChecker";
import { sendSubscriptionRenewalReminderEmail } from "./SendSubscriptionRenewalReminderEmail";

const sesClient = new SESClient({});
const dynamoDBClient = new DynamoDBClient({});

const fromEmail = env.getRequired("SES_FROM_EMAIL", "SES from email");
const replyToEmail = env.get("SES_REPLY_TO_EMAIL") || undefined;
const consentTableName = env.get("CONSENT_TABLE_NAME");
const usersTableName = env.get("USERS_TABLE_NAME");

const consentChecker = consentTableName && usersTableName
  ? createConsentChecker(dynamoDBClient, consentTableName, usersTableName, "billing_reminders")
  : undefined;

export const sendSubscriptionRenewalReminderEmailHandler = sendSubscriptionRenewalReminderEmail({
  sesClient,
  logger: getLogger("SendSubscriptionRenewalReminderEmail"),
  config: {
    fromEmail,
    replyToEmail,
  },
  consentChecker,
});
