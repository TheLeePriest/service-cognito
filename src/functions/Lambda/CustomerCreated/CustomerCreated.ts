import {
	AdminCreateUserCommand,
	type AdminCreateUserCommandOutput,
	ListUsersCommand,
	type ListUsersCommandOutput,
	AdminSetUserPasswordCommand,
	AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import type {
	CustomerCreatedDependencies,
	LicenseCreatedEvent,
} from "./CustomerCreated.types";
import { generateTempPassword } from "../../../shared/utils/generateTempPassword";
import { licensePurchaseHtml } from "../../../email/html/licensePurchase/licensePurchase";

// Simple in-memory cache to avoid repeated Cognito lookups
// SECURITY: Cache key uses licenseKey for proper user isolation
const userExistenceCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Escapes special characters in a string for use in Cognito filter expressions.
 * Cognito filter syntax requires escaping backslashes and double quotes.
 */
const escapeFilterValue = (value: string): string => {
	// First escape backslashes, then escape double quotes
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

/**
 * Validates that an email has a basic valid format to prevent injection attacks.
 * This is a defense-in-depth measure alongside escaping.
 */
const isValidEmailFormat = (email: string): boolean => {
	// Basic email format validation - must have @ and no control characters
	const emailRegex = /^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/;
	return emailRegex.test(email) && email.length <= 254;
};

const checkUserExists = async (
	cognitoClient: CustomerCreatedDependencies['cognitoClient'],
	userPoolId: string,
	email: string,
	licenseKey: string,
): Promise<boolean> => {
	// Validate email format before using in filter
	if (!isValidEmailFormat(email)) {
		throw new Error('Invalid email format');
	}

	// Create unique cache key using license context
	const cacheKey = `${licenseKey}:${email}`;

	// Check cache first
	const cached = userExistenceCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.exists;
	}

	try {
		// Use ListUsers instead of AdminGetUser to avoid marking user as active
		// SECURITY: Escape email to prevent filter injection attacks
		const escapedEmail = escapeFilterValue(email);
		const listUsersResult = await cognitoClient.send(
			new ListUsersCommand({
				UserPoolId: userPoolId,
				Filter: `email = "${escapedEmail}"`,
				Limit: 1,
			}),
		) as ListUsersCommandOutput;

		const exists = !!(listUsersResult.Users && listUsersResult.Users.length > 0);

		// Cache the result
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

/**
 * Send welcome email with license key using SES
 */
const sendWelcomeEmail = async (
	sesClient: CustomerCreatedDependencies['sesClient'],
	sesFromEmail: string,
	sesReplyToEmail: string,
	customerEmail: string,
	customerName: string,
	tempPassword: string,
	licenseKey: string,
	licenseType: string,
	productName: string,
	logger: CustomerCreatedDependencies['logger'],
): Promise<void> => {
	// Generate email HTML using the license purchase template (with temp password and email)
	const htmlBody = licensePurchaseHtml(
		customerName,
		productName || licenseType,
		licenseKey,
		tempPassword,
		customerEmail,
	);

	// Create plain text version
	const textBody = `
Welcome to CDK Insights, ${customerName}!

Thank you for your purchase. Your license is now active.

License Details:
- License Type: ${productName || licenseType}
- License Key: ${licenseKey}
- Status: Active

Your Account Credentials:
- Email: ${customerEmail}
- Temporary Password: ${tempPassword}

Getting Started:
1. Log in to your CDK Insights dashboard at https://cdkinsights.dev/login
2. You will be prompted to change your password on first login
3. Install the CLI: npm install -g cdk-insights
4. Configure your license: npx cdk-insights config setup
5. Enter your license key when prompted: ${licenseKey}
6. Start analyzing your CDK stacks!

Need Help?
- Documentation: https://docs.cdkinsights.dev
- Support: support@cdkinsights.dev

Thank you for choosing CDK Insights!
`.trim();

	const command = new SendEmailCommand({
		Source: sesFromEmail,
		Destination: {
			ToAddresses: [customerEmail],
		},
		ReplyToAddresses: [sesReplyToEmail],
		Message: {
			Subject: {
				Data: "Welcome to CDK Insights - Your License Details",
				Charset: "UTF-8",
			},
			Body: {
				Text: {
					Data: textBody,
					Charset: "UTF-8",
				},
				Html: {
					Data: htmlBody,
					Charset: "UTF-8",
				},
			},
		},
	});

	try {
		await sesClient.send(command);
		logger.info("Welcome email sent successfully", {
			customerEmail,
			licenseKey: `${licenseKey.substring(0, 8)}...`,
		});
	} catch (error) {
		logger.error("Failed to send welcome email", {
			customerEmail,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
};

export const customerCreated =
	({
		userPoolId,
		cognitoClient,
		sesClient,
		eventBridge,
		eventBusName,
		sesFromEmail,
		sesReplyToEmail,
		logger,
	}: CustomerCreatedDependencies) =>
	async (event: LicenseCreatedEvent) => {
		const { detail } = event;
		const {
			licenseKey,
			licenseType,
			customerEmail,
			customerName,
			productName,
			stripeSubscriptionId,
			createdAt,
		} = detail;

		console.log("detail in CustomerCreated", JSON.stringify(detail));

		if (!customerEmail) {
			logger.error("No valid email found in event data", {
				licenseKey,
				detail,
			});
			throw new Error("No valid email found in event data");
		}

		logger.info("Processing LicenseCreated event for Cognito user creation", {
			licenseKey: `${licenseKey.substring(0, 8)}...`,
			customerEmail,
		});

		try {
			// Use cached user existence check
			const userExists = await checkUserExists(cognitoClient, userPoolId, customerEmail, licenseKey);

			if (userExists) {
				logger.warn("User already exists in Cognito", {
					licenseKey: `${licenseKey.substring(0, 8)}...`,
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
							licenseKey: `${licenseKey.substring(0, 8)}...`,
							email: customerEmail,
							customerName,
						});
					} catch (updateError) {
						logger.warn("Failed to update existing Cognito user name", {
							licenseKey: `${licenseKey.substring(0, 8)}...`,
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
				licenseKey: `${licenseKey.substring(0, 8)}...`,
				error: err instanceof Error ? err.message : String(err),
			});

			// Continue with user creation attempt
		}

		const tempPassword = generateTempPassword({ length: 16 });

		// Create user in Cognito WITHOUT sending Cognito's default email
		// We'll send our own combined email with the license key
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
							Name: "custom:licenseKey",
							Value: licenseKey,
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
					// IMPORTANT: Suppress Cognito's default email - we send our own combined email
					MessageAction: "SUPPRESS",
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

			// Send combined welcome email with temp password + license key
			await sendWelcomeEmail(
				sesClient,
				sesFromEmail,
				sesReplyToEmail,
				customerEmail,
				customerName || "Customer",
				tempPassword,
				licenseKey,
				licenseType,
				productName || "CDK Insights License",
				logger,
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
					licenseKey,
					stripeSubscriptionId,
					organization: "",
					createdAt,
					updatedAt: createdAt,
				},
			);

			logger.info("Cognito user created successfully with combined welcome email", {
				cognitoUserId: createUserResult.User.Username,
				licenseKey: `${licenseKey.substring(0, 8)}...`,
			});
		} catch (error) {
			logger.error("Error creating Cognito user", {
				licenseKey: `${licenseKey.substring(0, 8)}...`,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	};
