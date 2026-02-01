import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendQuotaWarningEmailDetailSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  usedResources: z.number().int().nonnegative(),
  totalResources: z.number().int().positive(),
  percentUsed: z.number().min(0).max(100),
  resetDate: z.string().min(1),
  upgradeUrl: z.string().min(1),
});

export type SendQuotaWarningEmailDetail = z.infer<
  typeof SendQuotaWarningEmailDetailSchema
>;

export type SendQuotaWarningEmailEvent = EventBridgeEvent<
  "SendQuotaWarningEmail",
  SendQuotaWarningEmailDetail
>;

export interface SendQuotaWarningEmailDependencies {
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
