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
  // Refund fields (optional - only present when a refund was processed)
  refundProcessed: z.boolean().optional(),
  refundAmount: z.number().optional(), // Amount in cents
  refundCurrency: z.string().optional(), // e.g., 'gbp', 'usd'
  overageAmountNotRefunded: z.number().optional(), // Overage amount that wasn't refunded (in cents)
  // Cancellation type to differentiate trial expiry from user cancellation
  cancellationType: z.enum(['user_cancelled', 'trial_expired', 'refund_requested', 'payment_failed']).optional(),
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
  consentChecker?: (email: string) => Promise<boolean>;
}
