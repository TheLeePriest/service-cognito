import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendSubscriptionRenewalReminderEmailDetailSchema = z.object({
  stripeSubscriptionId: z.string().min(1),
  stripeCustomerId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  renewalDate: z.string().min(1),
  planName: z.string().min(1),
  amount: z.string().min(1),
  currency: z.string().min(1).default("$"),
  manageSubscriptionUrl: z.string().min(1),
});

export type SendSubscriptionRenewalReminderEmailDetail = z.infer<
  typeof SendSubscriptionRenewalReminderEmailDetailSchema
>;

export type SendSubscriptionRenewalReminderEmailEvent = EventBridgeEvent<
  "SendSubscriptionRenewalReminderEmail",
  SendSubscriptionRenewalReminderEmailDetail
>;

export interface SendSubscriptionRenewalReminderEmailDependencies {
  sesClient: {
    send: (command: SendEmailCommand) => Promise<unknown>;
  };
  logger: {
    info: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
    success: (message: string, context?: Record<string, unknown>) => void;
  };
  config: {
    fromEmail: string;
    replyToEmail?: string;
  };
}
