import {
  AdminCreateUserCommand,
  type AdminCreateUserCommandOutput,
  ListUsersCommand,
  type ListUsersCommandOutput,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type {
  TeamMemberActivatedDependencies,
  TeamMemberActivatedEvent,
} from "./TeamMemberActivated.types";
import { generateTempPassword } from "../../../shared/utils/generateTempPassword";

/**
 * Escapes special characters in a string for use in Cognito filter expressions.
 */
const escapeFilterValue = (value: string): string => {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
};

/**
 * Validates that an email has a basic valid format.
 */
const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Check if a user already exists in Cognito by email.
 */
const checkUserExists = async (
  cognitoClient: TeamMemberActivatedDependencies["cognitoClient"],
  userPoolId: string,
  email: string,
): Promise<{ exists: boolean; userId?: string }> => {
  if (!isValidEmailFormat(email)) {
    throw new Error("Invalid email format");
  }

  try {
    const escapedEmail = escapeFilterValue(email);
    const listUsersResult = (await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${escapedEmail}"`,
        Limit: 1,
      }),
    )) as ListUsersCommandOutput;

    if (listUsersResult.Users && listUsersResult.Users.length > 0) {
      const existingUser = listUsersResult.Users[0];
      const userId = existingUser.Attributes?.find(
        (attr) => attr.Name === "sub",
      )?.Value;
      return { exists: true, userId };
    }

    return { exists: false };
  } catch (error) {
    return { exists: false };
  }
};

/**
 * Handles the TeamMemberActivated event by creating a Cognito user
 * for the invited team member.
 *
 * This follows the same pattern as CustomerCreated but for team invitations.
 * The user will receive login credentials via email.
 */
export const teamMemberActivated =
  ({
    userPoolId,
    cognitoClient,
    eventBridge,
    eventBusName,
    logger,
  }: TeamMemberActivatedDependencies) =>
  async (event: TeamMemberActivatedEvent) => {
    const { detail } = event;
    const { email, name, teamId, subscriptionId, invitationId, role, activatedAt } =
      detail;

    if (!email) {
      logger.error("No valid email found in event data", {
        teamId,
        subscriptionId,
        detail,
      });
      throw new Error("No valid email found in event data");
    }

    logger.info("Processing team member activation for Cognito", {
      email,
      teamId,
      subscriptionId,
      invitationId,
      role,
    });

    try {
      // Check if user already exists in Cognito
      const existingUser = await checkUserExists(cognitoClient, userPoolId, email);

      if (existingUser.exists) {
        logger.info("User already exists in Cognito, emitting event for existing user", {
          email,
          teamId,
          userId: existingUser.userId,
        });

        // User exists - emit event so they can be linked to the team
        // This handles the case where someone with an existing account is invited to a team
        await eventBridge.putEvent(
          eventBusName,
          "service.cognito",
          "CognitoUserCreated",
          {
            userId: existingUser.userId,
            userName: email,
            cdkInsightsId: existingUser.userId,
            customerName: name,
            signUpDate: activatedAt,
            // Team members don't have their own Stripe customer - they use team's subscription
            stripeCustomerId: `TEAM_MEMBER_${teamId}_${existingUser.userId}`,
            stripeSubscriptionId: subscriptionId,
            organization: "Team Member",
            createdAt: activatedAt,
            updatedAt: activatedAt,
            // Team-specific fields
            teamId,
            invitationId,
            role,
            isTeamMember: true,
          },
        );

        return;
      }

      // Create new Cognito user
      const tempPassword = generateTempPassword({ length: 16 });

      const createUserResult = (await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: email,
          UserAttributes: [
            {
              Name: "email",
              Value: email,
            },
            {
              Name: "email_verified",
              Value: "true",
            },
            {
              Name: "custom:teamId",
              Value: teamId,
            },
            ...(name
              ? [
                  {
                    Name: "name",
                    Value: name,
                  },
                ]
              : []),
          ],
          TemporaryPassword: tempPassword,
          DesiredDeliveryMediums: ["EMAIL"],
        }),
      )) as AdminCreateUserCommandOutput;

      if (!createUserResult.User?.Username) {
        throw new Error("Failed to create Cognito user - no username returned");
      }

      // Set user password to force change on first login
      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: email,
          Password: tempPassword,
          Permanent: false,
        }),
      );

      // Extract user ID from attributes
      const userAttributes = createUserResult.User.Attributes?.reduce(
        (acc, attr) => {
          if (attr.Name && attr.Value) {
            acc[attr.Name] = attr.Value;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      if (!userAttributes?.sub) {
        throw new Error("Missing 'sub' attribute in Cognito user attributes");
      }

      const userId = userAttributes.sub;

      // Emit CognitoUserCreated event - same event as regular user flow
      // This will trigger CreatePlatformUser in service-user
      await eventBridge.putEvent(
        eventBusName,
        "service.cognito",
        "CognitoUserCreated",
        {
          userId,
          userName: email,
          cdkInsightsId: userId,
          customerName: name,
          signUpDate: activatedAt,
          // Team members use special identifiers - not real Stripe IDs
          stripeCustomerId: `TEAM_MEMBER_${teamId}_${userId}`,
          stripeSubscriptionId: subscriptionId,
          organization: "Team Member",
          createdAt: activatedAt,
          updatedAt: activatedAt,
          // Team-specific fields
          teamId,
          invitationId,
          role,
          isTeamMember: true,
        },
      );

      logger.info("Cognito user created successfully for team member", {
        cognitoUserId: userId,
        email,
        teamId,
        subscriptionId,
      });
    } catch (error) {
      logger.error("Error creating Cognito user for team member", {
        email,
        teamId,
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };
