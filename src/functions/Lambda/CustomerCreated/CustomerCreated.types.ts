import type {
	AdminCreateUserCommand,
	AdminCreateUserCommandOutput,
	AdminGetUserCommand,
	AdminGetUserCommandOutput,
	AdminSetUserPasswordCommand,
	AdminSetUserPasswordCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import type { EventBridgeEvent } from "aws-lambda";

export type CustomerCreatedEvent = EventBridgeEvent<
	"CustomerCreated",
	{
		stripeCustomerId: string;
		customerEmail?: string; // Optional since it might not be present
		customerName: string | null;
		createdAt: number;
		customerData: {
			id: string;
			email: string;
			name: string | null;
		};
		// Additional fields that might be present in the actual event
		userName?: string;
		email?: string;
		name?: string;
		// Allow for additional unknown fields
		[key: string]: unknown;
	}
>;

export type CustomerCreatedDependencies = {
	userPoolId: string;
	cognitoClient: {
		send: (
			command:
				| AdminGetUserCommand
				| AdminCreateUserCommand
				| AdminSetUserPasswordCommand,
		) => Promise<
			| AdminGetUserCommandOutput
			| AdminCreateUserCommandOutput
			| AdminSetUserPasswordCommandOutput
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
