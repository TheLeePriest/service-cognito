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
		stripeSubscriptionId: string;
		stripeCustomerId: string,
		customerEmail: string,
		customerName: string,
		items: {
			data: Array<{
			id: string;
			price: { product: string; id: string };
			quantity: number;
			current_period_end: number;
			}>;
		};		
  		status: string,
		createdAt: string,
		cancelAtPeriodEnd: string,
		trialStart: number,
		trialEnd: number
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
