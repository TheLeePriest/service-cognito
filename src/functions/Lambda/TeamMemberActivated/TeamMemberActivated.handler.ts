import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { teamMemberActivated } from "./TeamMemberActivated";
import { env } from "../../../shared/config/environment";
import { getLogger } from "../../../shared/logging/logger";

const userPoolId = env.getRequired("USER_POOL_ID", "TeamMemberActivated handler");
const eventBusName = env.getRequired("EVENT_BUS_NAME", "TeamMemberActivated handler");

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

export const teamMemberActivatedHandler = teamMemberActivated({
  userPoolId,
  cognitoClient,
  eventBridge,
  eventBusName,
  logger: getLogger("TeamMemberActivated"),
});

// Export as default handler for Lambda runtime
export const handler = teamMemberActivatedHandler;
