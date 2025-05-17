import {
	AdminGetUserCommand,
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";
import type {
	CreateCognitoUserDependencies,
	UserCreatedEvent,
} from "./CreateCognitoUser.types";

export const createCognitoUser =
	({
		cognitoClient,
		userPoolId,
		eventBridgeClient,
		eventBusName,
	}: CreateCognitoUserDependencies) =>
	async (event: UserCreatedEvent) => {
		const { detail } = event;
		console.log(detail, "detail");
		const { userName } = detail;

		try {
			await cognitoClient.send(
				new AdminGetUserCommand({
					UserPoolId: userPoolId,
					Username: userName,
				}),
			);
		} catch (err: unknown) {
			if (
				typeof err === "object" &&
				err !== null &&
				"name" in err &&
				(err as { name?: string }).name === "UserNotFoundException"
			) {
				const tempPassword = `${Math.random().toString(36).slice(-8)}L!`;
				await cognitoClient.send(
					new AdminCreateUserCommand({
						UserPoolId: userPoolId,
						Username: userName,
						UserAttributes: [
							{ Name: "email", Value: userName },
							{ Name: "email_verified", Value: "true" },
						],
						TemporaryPassword: tempPassword,
					}),
				);

				await cognitoClient.send(
					new AdminSetUserPasswordCommand({
						UserPoolId: userPoolId,
						Username: userName,
						Password: tempPassword,
						Permanent: true,
					}),
				);

				await eventBridgeClient.send(
					new PutEventsCommand({
						Entries: [
							{
								Source: "service.users",
								DetailType: "CognitoUserCreated",
								EventBusName: eventBusName,
								Detail: JSON.stringify({
									userId: userName,
									...detail,
								}),
							},
						],
					}),
				);
			} else {
				throw err;
			}
		}
	};
