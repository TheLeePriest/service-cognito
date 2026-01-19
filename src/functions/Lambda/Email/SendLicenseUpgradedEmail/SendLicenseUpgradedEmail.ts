import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { licenseUpgradedHtml } from "../../../../email/html/licenseUpgraded/licenseUpgraded";
import type {
	SendLicenseUpgradedEmailDependencies,
	SendLicenseUpgradedEmailEvent,
} from "./SendLicenseUpgradedEmail.types";
import { SendLicenseUpgradedEmailDetailSchema } from "./SendLicenseUpgradedEmail.types";

export const sendLicenseUpgradedEmail =
	(dependencies: SendLicenseUpgradedEmailDependencies) =>
	async (event: SendLicenseUpgradedEmailEvent): Promise<void> => {
		const { sesClient, logger, config } = dependencies;
		const context = {
			requestId: event.id,
			functionName: "sendLicenseUpgradedEmail",
		};

		let detail: z.infer<typeof SendLicenseUpgradedEmailDetailSchema>;
		try {
			detail = SendLicenseUpgradedEmailDetailSchema.parse(event.detail);
		} catch (error) {
			logger.error("Invalid SendLicenseUpgradedEmail payload", {
				...context,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new Error("Invalid SendLicenseUpgradedEmail payload");
		}

		const displayName =
			detail.customerName?.trim() ||
			detail.customerEmail.split("@")[0] ||
			"there";

		const subject = "Your CDK Insights Upgrade is Complete!";
		const htmlBody = licenseUpgradedHtml(
			displayName,
			detail.productName,
			detail.upgradeType,
		);
		const textBody = `Hi ${displayName},

Your CDK Insights upgrade is complete!

Plan: ${detail.productName}
Status: Active

Your license has been automatically activated. You can now continue analyzing your CDK stacks with no trial limits.

Go to Dashboard: https://cdkinsights.dev/dashboard

Need help? Contact us at support@cdkinsights.dev
`;

		logger.info("Sending license upgraded email", {
			...context,
			stripeSubscriptionId: detail.stripeSubscriptionId,
			stripeCustomerId: detail.stripeCustomerId,
			to: detail.customerEmail,
			productName: detail.productName,
			upgradeType: detail.upgradeType,
		});

		const command = new SendEmailCommand({
			Source: config.fromEmail,
			Destination: {
				ToAddresses: [detail.customerEmail],
			},
			ReplyToAddresses: config.replyToEmail ? [config.replyToEmail] : undefined,
			Message: {
				Subject: { Data: subject, Charset: "UTF-8" },
				Body: {
					Html: { Data: htmlBody, Charset: "UTF-8" },
					Text: { Data: textBody, Charset: "UTF-8" },
				},
			},
		});

		await sesClient.send(command);

		logger.success("License upgraded email sent", {
			...context,
			to: detail.customerEmail,
			stripeSubscriptionId: detail.stripeSubscriptionId,
		});
	};
