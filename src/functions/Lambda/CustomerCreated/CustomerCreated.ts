import {
	AdminCreateUserCommand,
	type AdminCreateUserCommandOutput,
	ListUsersCommand,
	type ListUsersCommandOutput,
	AdminSetUserPasswordCommand,
	AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { randomInt } from "node:crypto";
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

const generateTempPassword = (length = 16): string => {
	// Cognito password policies vary; this ensures a strong baseline:
	// - at least 1 uppercase, 1 lowercase, 1 digit, 1 symbol
	// - no hardcoded suffixes
	const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
	const lower = "abcdefghijkmnopqrstuvwxyz";
	const digits = "23456789";
	const symbols = "!@#$%^&*()-_=+[]{}:,.?";
	const all = upper + lower + digits + symbols;

	if (length < 12) {
		throw new Error("Temporary password length must be at least 12");
	}

	const pick = (chars: string): string => {
		const idx = randomInt(0, chars.length);
		const ch = chars[idx];
		if (!ch) {
			throw new Error("Failed to generate temporary password character");
		}
		return ch;
	};

	const chars: string[] = [
		pick(upper),
		pick(lower),
		pick(digits),
		pick(symbols),
	];

	while (chars.length < length) {
		chars.push(pick(all));
	}

	// Fisher–Yates shuffle
	for (let i = chars.length - 1; i > 0; i--) {
		const j = randomInt(0, i + 1);
		[chars[i], chars[j]] = [chars[j], chars[i]];
	}

	return chars.join("");
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

				// If we already have the user but no name was set, update it when available
				if (customerName) {
					try {
						await cognitoClient.send(
							new AdminUpdateUserAttributesCommand({
								UserPoolId: userPoolId,
								Username: customerEmail,
								UserAttributes: [
									{ Name: "name", Value: customerName },
									{ Name: "given_name", Value: customerName },
								],
							}),
						);
						logger.info("Updated existing Cognito user with name", {
							customerId: stripeCustomerId,
							email: customerEmail,
							customerName,
						});
					} catch (updateError) {
						logger.warn("Failed to update existing Cognito user name", {
							customerId: stripeCustomerId,
							email: customerEmail,
							error: updateError instanceof Error ? updateError.message : String(updateError),
						});
					}
				}

				// User already exists; nothing else to do
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

		const tempPassword = generateTempPassword(16);

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
					// IMPORTANT:
					// MessageAction: "RESEND" is only valid for resending to existing users.
					// If used during creation, Cognito throws UserNotFoundException.
					DesiredDeliveryMediums: ["EMAIL"], // Only send email
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
