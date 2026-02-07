import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendReEngagementEmailDetailSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  daysSinceLastScan: z.number().int().positive(),
  dashboardUrl: z.string().min(1),
});

export type SendReEngagementEmailDetail = z.infer<
  typeof SendReEngagementEmailDetailSchema
>;

export type SendReEngagementEmailEvent = EventBridgeEvent<
  "SendReEngagementEmail",
  SendReEngagementEmailDetail
>;

export interface SendReEngagementEmailDependencies {
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
