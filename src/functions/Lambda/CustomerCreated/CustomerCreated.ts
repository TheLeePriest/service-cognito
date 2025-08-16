import {
	AdminCreateUserCommand,
	type AdminCreateUserCommandOutput,
	AdminGetUserCommand,
	AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type {
	CustomerCreatedDependencies,
	CustomerCreatedEvent,
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
			// Check if user already exists to prevent duplicate creation
			try {
				await cognitoClient.send(
					new AdminGetUserCommand({
						UserPoolId: userPoolId,
						Username: customerEmail,
					}),
				);

				logger.warn("User already exists in Cognito", {
					customerId: stripeCustomerId,
				});

				// User already exists, no need to create
				return;
			} catch (err: unknown) {
				// Only proceed if the error is UserNotFoundException
				if (
					typeof err === "object" &&
					err !== null &&
					"name" in err &&
					(err as { name?: string }).name !== "UserNotFoundException"
				) {
					throw err;
				}
				// User doesn't exist, proceed with creation
			}

			// Generate a temporary password with better entropy
			const tempPassword = `${Math.random().toString(36).slice(-8)}A1!`;

			// Create user in Cognito
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
					name: customerName,
					signUpDate: createdAt,
					stripeCustomerId: stripeCustomerId,
					stripeSubscriptionId,
					organization: "",
					createdAt,
					updatedAt: createdAt,
				},
			);

			await eventBridge.putEvent(
				eventBusName,
				"service.cognito",
				"CognitoUserSubscriptionCreated",
				{
					userId: userAttributes.sub,
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
