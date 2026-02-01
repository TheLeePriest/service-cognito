import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendPaymentFailedEmailDetailSchema = z.object({
  stripeCustomerId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  failureReason: z.string().optional(),
  retryDate: z.string().optional(),
  updatePaymentUrl: z.string().min(1),
});

export type SendPaymentFailedEmailDetail = z.infer<
  typeof SendPaymentFailedEmailDetailSchema
>;

export type SendPaymentFailedEmailEvent = EventBridgeEvent<
  "SendPaymentFailedEmail",
  SendPaymentFailedEmailDetail
>;

export interface SendPaymentFailedEmailDependencies {
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
