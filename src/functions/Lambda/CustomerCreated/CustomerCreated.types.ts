import type {
	AdminCreateUserCommand,
	AdminCreateUserCommandOutput,
	AdminGetUserCommand,
	AdminGetUserCommandOutput,
	AdminSetUserPasswordCommand,
	AdminSetUserPasswordCommandOutput,
	AdminUpdateUserAttributesCommand,
	AdminUpdateUserAttributesCommandOutput,
	ListUsersCommand,
	ListUsersCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import type { SendEmailCommand, SendEmailCommandOutput } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";
import { z } from "zod";

// Zod schema for LicenseCreated event detail
export const licenseCreatedDetailSchema = z.object({
	licenseId: z.string(),
	licenseKey: z.string().min(1),
	stripeSubscriptionId: z.string(),
	stripeCustomerId: z.string().min(1),
	stripePriceId: z.string(),
	licenseType: z.enum(["PRO", "ENTERPRISE"]),
	status: z.string(),
	createdAt: z.number(),
	expiresAt: z.number(),
	assignedToUserId: z.string(),
	teamId: z.string().optional(),
	customerEmail: z.string().email().max(254),
	customerName: z.string().optional(),
	productName: z.string().optional(),
});

export type LicenseCreatedDetail = z.infer<typeof licenseCreatedDetailSchema>;

// LicenseCreated event from service.license
// This event is emitted after a license is successfully created
export type LicenseCreatedEvent = EventBridgeEvent<"LicenseCreated", LicenseCreatedDetail>;

// Legacy CustomerCreated event type (kept for backwards compatibility during transition)
export type CustomerCreatedEvent = EventBridgeEvent<
	"CustomerCreated",
	{
		stripeSubscriptionId: string;
		stripeCustomerId: string;
		customerEmail: string;
		customerName: string;
		items: Array<{
			itemId: string;
			productId: string;
			productName: string;
			productMetadata: Record<string, unknown>;
			priceId: string;
			priceData: Record<string, unknown>;
			quantity: number;
			expiresAt: number;
			metadata?: Record<string, unknown>;
			isTeamSubscription?: boolean;
		}>;
		status: string;
		createdAt: number;
		cancelAtPeriodEnd: boolean;
		trialStart?: number;
		trialEnd?: number;
		metadata?: Record<string, string>;
	}
>;

export type CustomerCreatedDependencies = {
	userPoolId: string;
	cognitoClient: {
		send: (
			command:
				| AdminGetUserCommand
				| AdminCreateUserCommand
				| AdminSetUserPasswordCommand
				| AdminUpdateUserAttributesCommand
				| ListUsersCommand,
		) => Promise<
			| AdminGetUserCommandOutput
			| AdminCreateUserCommandOutput
			| AdminSetUserPasswordCommandOutput
			| AdminUpdateUserAttributesCommandOutput
			| ListUsersCommandOutput
		>;
	};
	sesClient: {
		send: (command: SendEmailCommand) => Promise<SendEmailCommandOutput>;
	};
	eventBridge: {
		putEvent: (
			eventBusName: string,
			source: string,
			detailType: string,
			detail: Record<string, unknown>,
		) => Promise<void>;
	};
	eventBusName: string;
	sesFromEmail: string;
	sesReplyToEmail: string;
	logger: {
		info: (message: string, context?: Record<string, unknown>) => void;
		error: (message: string, context?: Record<string, unknown>) => void;
		warn: (message: string, context?: Record<string, unknown>) => void;
	};
};
