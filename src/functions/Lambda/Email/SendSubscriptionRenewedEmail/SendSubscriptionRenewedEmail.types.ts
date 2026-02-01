import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendSubscriptionRenewedEmailDetailSchema = z.object({
  stripeSubscriptionId: z.string().min(1),
  stripeCustomerId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  planName: z.string().min(1),
  amount: z.string().min(1),
  currency: z.string().min(1).default("$"),
  nextRenewalDate: z.string().min(1),
  dashboardUrl: z.string().min(1),
});

export type SendSubscriptionRenewedEmailDetail = z.infer<
  typeof SendSubscriptionRenewedEmailDetailSchema
>;

export type SendSubscriptionRenewedEmailEvent = EventBridgeEvent<
  "SendSubscriptionRenewedEmail",
  SendSubscriptionRenewedEmailDetail
>;

export interface SendSubscriptionRenewedEmailDependencies {
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
