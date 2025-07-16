import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { paymentMethodAttached } from "./PaymentMethodAttached";
import { env } from "../../../shared/config/environment";
import { logger } from "../../../shared/logging/logger";

const userPoolId = env.getRequired("USER_POOL_ID", "PaymentMethodAttached handler");
const eventBusName = env.getRequired("EVENT_BUS_NAME", "PaymentMethodAttached handler");

const cognitoClient = new CognitoIdentityProviderClient({});
const eventBridgeClient = new EventBridgeClient();

// Create event bridge wrapper
const eventBridge = {
  putEvent: async (
    eventBusName: string,
    source: string,
    detailType: string,
    detail: Record<string, unknown>,
  ) => {
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: source,
            DetailType: detailType,
            Detail: JSON.stringify(detail),
            EventBusName: eventBusName,
          },
        ],
      }),
    );
  },
};

export const paymentMethodAttachedHandler = paymentMethodAttached({
  userPoolId,
  cognitoClient,
  eventBridge,
  eventBusName,
  logger,
}); 