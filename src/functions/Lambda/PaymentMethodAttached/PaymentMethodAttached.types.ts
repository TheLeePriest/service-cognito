import type { EventBridgeEvent } from "aws-lambda";
import type {
  AdminUpdateUserAttributesCommand,
  AdminUpdateUserAttributesCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";

export type PaymentMethodAttachedEvent = EventBridgeEvent<
  "PaymentMethodAttached",
  {
    stripeCustomerId: string;
    stripePaymentMethodId: string;
    paymentMethodType: string;
    createdAt: number;
    customerData: {
      id: string;
      email: string;
      name: string | null;
    };
  }
>;

export type PaymentMethodAttachedDependencies = {
  userPoolId: string;
  cognitoClient: {
    send: (
      command: AdminUpdateUserAttributesCommand,
    ) => Promise<AdminUpdateUserAttributesCommandOutput>;
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