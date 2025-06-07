import type {
	AdminGetUserCommand,
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	AdminGetUserCommandOutput,
	AdminCreateUserCommandOutput,
	AdminSetUserPasswordCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import type { EventBridgeEvent } from "aws-lambda";
import type {
	PutEventsCommand,
	PutEventsCommandOutput,
} from "@aws-sdk/client-eventbridge";

export type CreateCognitoUserDependencies = {
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
	eventBridgeClient: {
		send: (command: PutEventsCommand) => Promise<PutEventsCommandOutput>;
	};
	eventBusName: string;
};

export type StripeCustomerCreated = {
	userName: string;
	name: string;
	signUpDate: string;
	stripeCustomerId: string;
	stripeSubscriptionId: string;
	subscriptionStatus: string;
	planId: string;
	priceId: string;
	subscriptionStartDate: string;
	currentPeriodEndDate: string;
	currency: string;
	trialEndDate: string;
	cancelAtPeriodEnd: boolean;
	organization: string;
	firstName: string;
	lastName: string;
	createdAt: string;
	updatedAt: string;
};

export type UserCreatedEvent = EventBridgeEvent<
	"CustomerCreated",
	StripeCustomerCreated
>;

export type UserAttributesObject = {
	sub: string;
};
