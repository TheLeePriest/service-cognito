import {
	AdminGetUserCommand,
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	type AdminCreateUserCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";
import type {
	CreateCognitoUserDependencies,
	UserAttributesObject,
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
		const { userName, name } = detail;

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
				const cognitoUser = (await cognitoClient.send(
					new AdminCreateUserCommand({
						UserPoolId: userPoolId,
						Username: userName,
						UserAttributes: [
							{ Name: "email", Value: userName },
							{ Name: "email_verified", Value: "false" },
							{ Name: "name", Value: name || "" },
						],
						TemporaryPassword: tempPassword,
					}),
				)) as AdminCreateUserCommandOutput;

				await cognitoClient.send(
					new AdminSetUserPasswordCommand({
						UserPoolId: userPoolId,
						Username: userName,
						Password: tempPassword,
						Permanent: false,
					}),
				);

				const { User } = cognitoUser;

				if (!User) {
					throw new Error("Failed to create user in Cognito");
				}

				const { Attributes } = User;

				if (!Attributes) {
					throw new Error("Failed to find user attributes in Cognito");
				}

				const userAttributesRecord = Attributes?.reduce(
					(acc, attr) => {
						if (attr.Name && attr.Value) {
							acc[attr.Name] = attr.Value;
						}
						return acc;
					},
					{} as Record<string, string>,
				);

				if (!userAttributesRecord?.sub) {
					throw new Error("Missing 'sub' attribute in Cognito user attributes");
				}

				const userAttributesObject: UserAttributesObject = {
					sub: userAttributesRecord.sub,
				};

				await eventBridgeClient.send(
					new PutEventsCommand({
						Entries: [
							{
								Source: "service.cognito",
								DetailType: "CognitoUserCreated",
								EventBusName: eventBusName,
								Detail: JSON.stringify({
									userId: userName,
									cdkInsightsId: userAttributesObject.sub,
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
