import {
	AdminCreateUserCommand,
	type AdminCreateUserCommandOutput,
	ListUsersCommand,
	type ListUsersCommandOutput,
	AdminSetUserPasswordCommand,
	AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import {
	type CustomerCreatedDependencies,
	type LicenseCreatedEvent,
	licenseCreatedDetailSchema,
} from "./CustomerCreated.types";
import { generateTempPassword } from "../../../shared/utils/generateTempPassword";
import { licensePurchaseHtml } from "../../../email/html/licensePurchase/licensePurchase";

// Simple in-memory cache to avoid repeated Cognito lookups within Lambda warm instances
const userExistenceCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Truncates license key for safe logging */
const truncateLicenseKey = (licenseKey: string): string => `${licenseKey.substring(0, 8)}...`;

/** Escapes special characters for Cognito filter expressions */
const escapeForCognitoFilter = (value: string): string =>
	value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const checkUserExists = async (
	cognitoClient: CustomerCreatedDependencies['cognitoClient'],
	userPoolId: string,
	email: string,
): Promise<boolean> => {
	const cached = userExistenceCache.get(email);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.exists;
	}

	try {
		const listUsersResult = await cognitoClient.send(
			new ListUsersCommand({
				UserPoolId: userPoolId,
				Filter: `email = "${escapeForCognitoFilter(email)}"`,
				Limit: 1,
			}),
		) as ListUsersCommandOutput;

		const exists = (listUsersResult.Users?.length ?? 0) > 0;

		userExistenceCache.set(email, { exists, timestamp: Date.now() });
		return exists;
	} catch {
		// If Cognito call fails, don't cache and return false to proceed with creation
		return false;
	}
};

type WelcomeEmailParams = {
	sesClient: CustomerCreatedDependencies['sesClient'];
	sesFromEmail: string;
	sesReplyToEmail: string;
	customerEmail: string;
	customerName: string;
	tempPassword: string;
	licenseKey: string;
	licenseType: string;
	productName: string;
	logger: CustomerCreatedDependencies['logger'];
};

const sendWelcomeEmail = async ({
	sesClient,
	sesFromEmail,
	sesReplyToEmail,
	customerEmail,
	customerName,
	tempPassword,
	licenseKey,
	licenseType,
	productName,
	logger,
}: WelcomeEmailParams): Promise<void> => {
	const displayLicenseType = productName || licenseType;

	const htmlBody = licensePurchaseHtml(
		customerName,
		displayLicenseType,
		licenseKey,
		tempPassword,
		customerEmail,
	);

	const textBody = `
Welcome to CDK Insights, ${customerName}!

Thank you for your purchase. Your license is now active.

License Details:
- License Type: ${displayLicenseType}
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

	await sesClient.send(
		new SendEmailCommand({
			Source: sesFromEmail,
			Destination: { ToAddresses: [customerEmail] },
			ReplyToAddresses: [sesReplyToEmail],
			Message: {
				Subject: { Data: "Welcome to CDK Insights - Your License Details", Charset: "UTF-8" },
				Body: {
					Text: { Data: textBody, Charset: "UTF-8" },
					Html: { Data: htmlBody, Charset: "UTF-8" },
				},
			},
		}),
	);

	logger.info("Welcome email sent successfully", {
		customerEmail,
		licenseKey: truncateLicenseKey(licenseKey),
	});
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
		// Validate the entire event detail at entry point
		const parseResult = licenseCreatedDetailSchema.safeParse(event.detail);
		if (!parseResult.success) {
			logger.error("Invalid event data", {
				errors: parseResult.error.flatten(),
				detail: event.detail,
			});
			throw new Error(`Invalid event data: ${parseResult.error.message}`);
		}

		const {
			licenseKey,
			licenseType,
			customerEmail,
			customerName,
			productName,
			stripeSubscriptionId,
			createdAt,
		} = parseResult.data;

		const logContext = { licenseKey: truncateLicenseKey(licenseKey), customerEmail };

		logger.info("Processing LicenseCreated event for Cognito user creation", logContext);

		// Check if user already exists
		const userExists = await checkUserExists(cognitoClient, userPoolId, customerEmail);

		if (userExists) {
			logger.info("User already exists in Cognito", logContext);

			// Update name if available and not previously set
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
					logger.info("Updated existing Cognito user with name", { ...logContext, customerName });
				} catch (updateError) {
					logger.warn("Failed to update existing Cognito user name", {
						...logContext,
						error: updateError instanceof Error ? updateError.message : String(updateError),
					});
				}
			}
			return;
		}

		// Create new user
		const tempPassword = generateTempPassword({ length: 16 });

		const createUserResult = (await cognitoClient.send(
			new AdminCreateUserCommand({
				UserPoolId: userPoolId,
				Username: customerEmail,
				UserAttributes: [
					{ Name: "email", Value: customerEmail },
					{ Name: "email_verified", Value: "true" },
					{ Name: "custom:licenseKey", Value: licenseKey },
					...(customerName ? [{ Name: "name", Value: customerName }] : []),
				],
				TemporaryPassword: tempPassword,
				MessageAction: "SUPPRESS", // We send our own welcome email
			}),
		)) as AdminCreateUserCommandOutput;

		if (!createUserResult.User?.Username) {
			throw new Error("Failed to create Cognito user - no username returned");
		}

		// Set password to force change on first login
		await cognitoClient.send(
			new AdminSetUserPasswordCommand({
				UserPoolId: userPoolId,
				Username: customerEmail,
				Password: tempPassword,
				Permanent: false,
			}),
		);

		// Send welcome email
		await sendWelcomeEmail({
			sesClient,
			sesFromEmail,
			sesReplyToEmail,
			customerEmail,
			customerName: customerName ?? "Customer",
			tempPassword,
			licenseKey,
			licenseType,
			productName: productName ?? "CDK Insights License",
			logger,
		});

		// Extract user sub for event
		const userSub = createUserResult.User.Attributes?.find(attr => attr.Name === "sub")?.Value;
		if (!userSub) {
			throw new Error("Missing 'sub' attribute in Cognito user attributes");
		}

		// Emit CognitoUserCreated event
		await eventBridge.putEvent(eventBusName, "service.cognito", "CognitoUserCreated", {
			userId: userSub,
			userName: customerEmail,
			cdkInsightsId: userSub,
			customerName,
			signUpDate: createdAt,
			licenseKey,
			stripeSubscriptionId,
			organization: "",
			createdAt,
			updatedAt: createdAt,
		});

		logger.info("Cognito user created successfully", {
			...logContext,
			cognitoUserId: createUserResult.User.Username,
		});
	};
