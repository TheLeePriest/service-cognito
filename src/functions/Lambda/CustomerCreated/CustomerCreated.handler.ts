import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { customerCreated } from "./CustomerCreated";

const userPoolId = process.env.USER_POOL_ID;
const eventBusName = process.env.EVENT_BUS_NAME;

if (!eventBusName) {
  throw new Error("EVENT_BUS_NAME environment variable is not set");
}

if (!userPoolId) {
  throw new Error("USER_POOL_ID environment variable is not set");
}

const cognitoClient = new CognitoIdentityProviderClient({});

// Simple logger implementation
const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(`[INFO] ${message}`, context);
  },
  error: (message: string, context?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, context);
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, context);
  },
};

// Simple event bridge implementation
const eventBridge = {
  putEvent: async (
    eventBusName: string,
    source: string,
    detailType: string,
    detail: Record<string, unknown>,
  ) => {
    // Implementation would go here
    console.log("Event would be sent:", { eventBusName, source, detailType, detail });
  },
};

export const handler = customerCreated({
  userPoolId,
  cognitoClient,
  eventBridge,
  eventBusName,
  logger,
}); 