import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendFeedbackRequestEmailDetailSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  totalScans: z.number().int().nonnegative(),
  feedbackUrl: z.string().min(1),
});

export type SendFeedbackRequestEmailDetail = z.infer<
  typeof SendFeedbackRequestEmailDetailSchema
>;

export type SendFeedbackRequestEmailEvent = EventBridgeEvent<
  "SendFeedbackRequestEmail",
  SendFeedbackRequestEmailDetail
>;

export interface SendFeedbackRequestEmailDependencies {
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
