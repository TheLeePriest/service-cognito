import { AdminCreateUserCommand, AdminSetUserPasswordCommand, type AdminCreateUserCommandOutput } from "@aws-sdk/client-cognito-identity-provider";
import type {
  CustomerCreatedEvent,
  CustomerCreatedDependencies,
} from "./CustomerCreated.types";

export const customerCreated =
  ({
    userPoolId,
    cognitoClient,
    eventBridge,
    eventBusName,
    logger,
  }: CustomerCreatedDependencies) =>
  async (event: CustomerCreatedEvent) => {
    const { detail } = event;
    const {
      stripeCustomerId,
      customerEmail,
      customerName,
      createdAt,
      customerData,
    } = detail;

    logger.info("Processing customer created for Cognito", {
      customerId: stripeCustomerId,
      customerEmail,
      customerName,
    });

    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + "A1!";

      // Create user in Cognito
      const createUserResult = await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: customerEmail,
          UserAttributes: [
            {
              Name: "email",
              Value: customerEmail,
            },
            {
              Name: "email_verified",
              Value: "true",
            },
            {
              Name: "custom:stripe_customer_id",
              Value: stripeCustomerId,
            },
            ...(customerName ? [{
              Name: "name",
              Value: customerName,
            }] : []),
          ],
          TemporaryPassword: tempPassword,
          MessageAction: "SUPPRESS", // Don't send welcome email
        }),
      ) as AdminCreateUserCommandOutput;

      if (!createUserResult.User?.Username) {
        throw new Error("Failed to create Cognito user");
      }

      // Set user password to force change on first login
      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: customerEmail,
          Password: tempPassword,
          Permanent: false, // User must change password on first login
        }),
      );

      // Emit Cognito user created event
      await eventBridge.putEvent(
        eventBusName,
        "service.cognito",
        "CognitoUserCreated",
        {
          cognitoUserId: createUserResult.User.Username,
          customerId: stripeCustomerId,
          customerEmail,
          customerName,
          createdAt: new Date().toISOString(),
        },
      );

      logger.info("Cognito user created successfully", {
        cognitoUserId: createUserResult.User.Username,
        customerId: stripeCustomerId,
        customerEmail,
      });
    } catch (error) {
      logger.error("Error creating Cognito user", {
        customerId: stripeCustomerId,
        customerEmail,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }; 