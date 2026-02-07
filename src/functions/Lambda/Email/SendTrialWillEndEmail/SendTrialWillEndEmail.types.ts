import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendTrialWillEndEmailDetailSchema = z.object({
  stripeSubscriptionId: z.string().min(1),
  stripeCustomerId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  trialEnd: z.number().int().positive(),
  upgradeUrl: z.string().min(1),
});

export type SendTrialWillEndEmailDetail = z.infer<
  typeof SendTrialWillEndEmailDetailSchema
>;

export type SendTrialWillEndEmailEvent = EventBridgeEvent<
  "SendTrialWillEndEmail",
  SendTrialWillEndEmailDetail
>;

export interface SendTrialWillEndEmailDependencies {
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

