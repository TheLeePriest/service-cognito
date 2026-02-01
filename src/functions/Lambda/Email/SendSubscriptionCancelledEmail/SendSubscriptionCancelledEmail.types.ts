import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendSubscriptionCancelledEmailDetailSchema = z.object({
  stripeSubscriptionId: z.string().min(1),
  stripeCustomerId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  accessEndDate: z.string().min(1),
  reactivateUrl: z.string().min(1),
});

export type SendSubscriptionCancelledEmailDetail = z.infer<
  typeof SendSubscriptionCancelledEmailDetailSchema
>;

export type SendSubscriptionCancelledEmailEvent = EventBridgeEvent<
  "SendSubscriptionCancelledEmail",
  SendSubscriptionCancelledEmailDetail
>;

export interface SendSubscriptionCancelledEmailDependencies {
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
