import type { EventBridgeEvent } from "aws-lambda";
import type {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminCreateUserCommandOutput,
  AdminSetUserPasswordCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";

export type CustomerCreatedEvent = EventBridgeEvent<
  "CustomerCreated",
  {
    stripeCustomerId: string;
    customerEmail: string;
    customerName: string | null;
    createdAt: number;
    customerData: {
      id: string;
      email: string;
      name: string | null;
    };
  }
>;

export type CustomerCreatedDependencies = {
  userPoolId: string;
  cognitoClient: {
    send: (
      command: AdminCreateUserCommand | AdminSetUserPasswordCommand,
    ) => Promise<AdminCreateUserCommandOutput | AdminSetUserPasswordCommandOutput>;
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