import {
	AdminCreateUserCommand,
	type AdminCreateUserCommandOutput,
	ListUsersCommand,
	type ListUsersCommandOutput,
	AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type {
	CustomerCreatedDependencies,
	CustomerCreatedEvent,
} from "./CustomerCreated.types";

// Simple in-memory cache to avoid repeated Cognito lookups
// SECURITY: Cache key uses stripeCustomerId for proper user isolation
// Note: userPoolId is the same for all users, so it doesn't provide isolation
const userExistenceCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const checkUserExists = async (
	cognitoClient: CustomerCreatedDependencies['cognitoClient'],
	userPoolId: string,
	email: string,
	stripeCustomerId: string, // Make this required for proper isolation
): Promise<boolean> => {
	// Create unique cache key using ONLY customer context
	// userPoolId is the same for all users, so it doesn't provide isolation
	const cacheKey = `${stripeCustomerId}:${email}`;
	
	// Check cache first
	const cached = userExistenceCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.exists;
	}

	try {
		// Use ListUsers instead of AdminGetUser to avoid marking user as active
		const listUsersResult = await cognitoClient.send(
			new ListUsersCommand({
				UserPoolId: userPoolId,
				Filter: `email = "${email}"`,
				Limit: 1,
			}),
		) as ListUsersCommandOutput;

		const exists = !!(listUsersResult.Users && listUsersResult.Users.length > 0);
		
		// Cache the result with customer-scoped key only
		userExistenceCache.set(cacheKey, {
			exists,
			timestamp: Date.now(),
		});

		return exists;
	} catch (error) {
		// If Cognito call fails, don't cache and return false to proceed with creation
		return false;
	}
};

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
		console.log("detail", detail);
		const {
			stripeSubscriptionId,
			stripeCustomerId,
			customerEmail,
			customerName,
			createdAt,
			items,
			status,
			cancelAtPeriodEnd,
			trialStart,
			trialEnd,
		} = detail;

		console.log(items, 'items')

		if (!customerEmail) {
			logger.error("No valid email found in event data", {
				customerId: stripeCustomerId,
				customerEmail,
				detail,
			});
			throw new Error("No valid email found in event data");
		}

		logger.info("Processing customer created for Cognito", {
			customerId: stripeCustomerId,
		});

		try {
			// Use cached user existence check with customer context
			const userExists = await checkUserExists(cognitoClient, userPoolId, customerEmail, stripeCustomerId);
			
			if (userExists) {
				logger.warn("User already exists in Cognito", {
					customerId: stripeCustomerId,
					email: customerEmail,
				});

				// User already exists, no need to create
				return;
			}
			// User doesn't exist, proceed with creation
		} catch (err: unknown) {
			// Log the error but don't fail the entire operation
			logger.warn("Error checking user existence in Cognito", {
				customerId: stripeCustomerId,
				error: err instanceof Error ? err.message : String(err),
			});
			
			// Continue with user creation attempt
		}

		// Generate a temporary password with better entropy
		const tempPassword = `${Math.random().toString(36).slice(-8)}A1!`;

		// Create user in Cognito
		try {
			const createUserResult = (await cognitoClient.send(
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
							Name: "custom:stripeCustomerId",
							Value: stripeCustomerId,
						},
						...(customerName
							? [
									{
										Name: "name",
										Value: customerName,
									},
								]
							: []),
					],
					TemporaryPassword: tempPassword,
				}),
			)) as AdminCreateUserCommandOutput;

			if (!createUserResult.User?.Username) {
				throw new Error("Failed to create Cognito user - no username returned");
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

			// Extract user attributes for the event
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

			// Emit Cognito user created event
			await eventBridge.putEvent(
				eventBusName,
				"service.cognito",
				"CognitoUserCreated",
				{
					userId: userAttributes.sub,
					userName: customerEmail,
					cdkInsightsId: userAttributes.sub,
					customerName,
					signUpDate: createdAt,
					stripeCustomerId: stripeCustomerId,
					stripeSubscriptionId,
					organization: "",
					createdAt,
					updatedAt: createdAt,
				},
			);

			logger.info("Cognito user created successfully", {
				cognitoUserId: createUserResult.User.Username,
				customerId: stripeCustomerId,
			});
		} catch (error) {
			logger.error("Error creating Cognito user", {
				customerId: stripeCustomerId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	};
