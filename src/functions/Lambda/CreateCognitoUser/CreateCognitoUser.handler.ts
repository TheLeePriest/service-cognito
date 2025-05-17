import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { createCognitoUser } from "./CreateCognitoUser";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

const userPoolId = process.env.USER_POOL_ID;
const eventBusName = process.env.EVENT_BUS_NAME;

if (!userPoolId) {
	throw new Error("USER_POOL_ID environment variable is not set");
}
if (!eventBusName) {
	throw new Error("EVENT_BUS_NAME environment variable is not set");
}

const cognitoClient = new CognitoIdentityProviderClient({});
const eventBridgeClient = new EventBridgeClient({});
export const createCognitoUserHandler = createCognitoUser({
	eventBridgeClient,
	cognitoClient,
	userPoolId,
	eventBusName,
});
