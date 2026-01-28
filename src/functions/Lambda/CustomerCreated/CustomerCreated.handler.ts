import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { SESClient } from "@aws-sdk/client-ses";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { customerCreated } from "./CustomerCreated";
import { env } from "../../../shared/config/environment";
import { getLogger } from "../../../shared/logging/logger";

const userPoolId = env.getRequired("USER_POOL_ID", "CustomerCreated handler");
const eventBusName = env.getRequired("EVENT_BUS_NAME", "CustomerCreated handler");
const sesFromEmail = env.get("SES_FROM_EMAIL") ?? "noreply@cdkinsights.dev";
const sesReplyToEmail = env.get("SES_REPLY_TO_EMAIL") ?? "support@cdkinsights.dev";
const stage = env.get("STAGE") ?? "dev";

const cognitoClient = new CognitoIdentityProviderClient({});
const sesClient = new SESClient({});
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

export const customerCreatedHandler = customerCreated({
  userPoolId,
  cognitoClient,
  sesClient,
  eventBridge,
  eventBusName,
  sesFromEmail,
  sesReplyToEmail,
  stage: stage as "dev" | "prod" | "test",
  logger: getLogger("CustomerCreated"),
});

// Export as default handler for Lambda runtime
export const handler = customerCreatedHandler;
