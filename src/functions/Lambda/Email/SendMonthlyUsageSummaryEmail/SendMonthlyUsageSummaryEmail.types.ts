import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const UsageSummaryDataSchema = z.object({
  totalScans: z.number().int().nonnegative(),
  totalResources: z.number().int().nonnegative(),
  issuesFound: z.number().int().nonnegative(),
  criticalIssues: z.number().int().nonnegative(),
  highIssues: z.number().int().nonnegative(),
  mediumIssues: z.number().int().nonnegative(),
  lowIssues: z.number().int().nonnegative(),
  topServices: z.array(
    z.object({
      name: z.string(),
      count: z.number().int().nonnegative(),
    })
  ),
});

export const SendMonthlyUsageSummaryEmailDetailSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  month: z.string().min(1),
  year: z.string().min(1),
  usage: UsageSummaryDataSchema,
  dashboardUrl: z.string().min(1),
});

export type SendMonthlyUsageSummaryEmailDetail = z.infer<
  typeof SendMonthlyUsageSummaryEmailDetailSchema
>;

export type SendMonthlyUsageSummaryEmailEvent = EventBridgeEvent<
  "SendMonthlyUsageSummaryEmail",
  SendMonthlyUsageSummaryEmailDetail
>;

export interface SendMonthlyUsageSummaryEmailDependencies {
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
