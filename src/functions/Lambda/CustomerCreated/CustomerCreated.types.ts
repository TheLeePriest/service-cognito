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
import type { EventBridgeEvent } from "aws-lambda";

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
		createdAt: number; // Unix timestamp in seconds from Stripe
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
	eventBridge: {
		putEvent: (
			eventBusName: string,
			source: string,
			detailType: string,
			detail: Record<string, unknown>,
		) => Promise<void>;
	};
	eventBusName: string;
	logger: {
		info: (message: string, context?: Record<string, unknown>) => void;
		error: (message: string, context?: Record<string, unknown>) => void;
		warn: (message: string, context?: Record<string, unknown>) => void;
	};
};
