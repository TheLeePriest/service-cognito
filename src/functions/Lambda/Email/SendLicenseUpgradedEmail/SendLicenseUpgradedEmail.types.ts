import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const SendLicenseUpgradedEmailDetailSchema = z.object({
  stripeSubscriptionId: z.string().min(1),
  stripeCustomerId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  productName: z.string().min(1),
  upgradeType: z.string().min(1),
  upgradedAt: z.number().int().positive(),
});

export type SendLicenseUpgradedEmailDetail = z.infer<
  typeof SendLicenseUpgradedEmailDetailSchema
>;

export type SendLicenseUpgradedEmailEvent = EventBridgeEvent<
  "SendLicenseUpgradedEmail",
  SendLicenseUpgradedEmailDetail
>;

export interface SendLicenseUpgradedEmailDependencies {
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
