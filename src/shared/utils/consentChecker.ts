import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

export type EmailConsentType =
	| "billing_reminders"
	| "usage_alerts"
	| "monthly_reports"
	| "product_updates"
	| "marketing_emails";

// Default consent values for each email type (when no explicit consent record exists)
const DEFAULT_CONSENTS: Record<EmailConsentType, boolean> = {
	billing_reminders: true,
	usage_alerts: true,
	product_updates: true,
	monthly_reports: false,
	marketing_emails: false,
};

export const checkEmailConsent = async (
	dynamoDBClient: DynamoDBClient,
	consentTableName: string,
	userId: string,
	consentType: EmailConsentType,
): Promise<{ hasConsent: boolean }> => {
	const response = await dynamoDBClient.send(
		new QueryCommand({
			TableName: consentTableName,
			KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
			ExpressionAttributeValues: {
				":pk": { S: `CONSENT#${userId}` },
				":sk": { S: `${consentType}#` },
			},
			ScanIndexForward: false,
			Limit: 1,
		}),
	);

	if (!response.Items?.length) {
		return { hasConsent: DEFAULT_CONSENTS[consentType] };
	}

	const item = response.Items[0];
	const granted = item.granted?.BOOL ?? false;
	const withdrawnAt = item.withdrawnAt?.S;

	return { hasConsent: granted && !withdrawnAt };
};

export const resolveUserIdFromEmail = async (
	dynamoDBClient: DynamoDBClient,
	usersTableName: string,
	customerEmail: string,
): Promise<string | null> => {
	const response = await dynamoDBClient.send(
		new QueryCommand({
			TableName: usersTableName,
			IndexName: "EmailIndex",
			KeyConditionExpression: "email = :email",
			ExpressionAttributeValues: {
				":email": { S: customerEmail },
			},
			Limit: 1,
		}),
	);

	if (!response.Items?.length) return null;
	return response.Items[0].userId?.S ?? response.Items[0].PK?.S ?? null;
};

export const createConsentChecker = (
	dynamoDBClient: DynamoDBClient,
	consentTableName: string,
	usersTableName: string,
	consentType: EmailConsentType,
): ((email: string) => Promise<boolean>) => {
	return async (email: string): Promise<boolean> => {
		const userId = await resolveUserIdFromEmail(dynamoDBClient, usersTableName, email);
		if (!userId) return true; // Unknown user — allow email
		const { hasConsent } = await checkEmailConsent(dynamoDBClient, consentTableName, userId, consentType);
		return hasConsent;
	};
};
