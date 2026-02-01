import type { SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

export const FeatureItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const SendFeatureAnnouncementEmailDetailSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  announcementTitle: z.string().min(1),
  announcementDescription: z.string().min(1),
  features: z.array(FeatureItemSchema).min(1),
  learnMoreUrl: z.string().min(1),
});

export type SendFeatureAnnouncementEmailDetail = z.infer<
  typeof SendFeatureAnnouncementEmailDetailSchema
>;

export type SendFeatureAnnouncementEmailEvent = EventBridgeEvent<
  "SendFeatureAnnouncementEmail",
  SendFeatureAnnouncementEmailDetail
>;

export interface SendFeatureAnnouncementEmailDependencies {
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
