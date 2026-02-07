import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendQuotaExceededEmailDetailSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  usedResources: z.number().int().nonnegative(),
  totalResources: z.number().int().positive(),
  resetDate: z.string().min(1),
  upgradeUrl: z.string().min(1),
});

export type SendQuotaExceededEmailDetail = z.infer<
  typeof SendQuotaExceededEmailDetailSchema
>;

export type SendQuotaExceededEmailEvent = EventBridgeEvent<
  "SendQuotaExceededEmail",
  SendQuotaExceededEmailDetail
>;

export interface SendQuotaExceededEmailDependencies {
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
