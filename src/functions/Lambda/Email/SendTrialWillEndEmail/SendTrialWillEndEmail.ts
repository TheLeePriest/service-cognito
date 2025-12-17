import { SendEmailCommand } from "@aws-sdk/client-ses";
import type { z } from "zod";
import { trialWillEndHtml } from "../../../../email/html/trialWillEnd/trialWillEnd";
import type {
	SendTrialWillEndEmailDependencies,
	SendTrialWillEndEmailEvent,
} from "./SendTrialWillEndEmail.types";
import { SendTrialWillEndEmailDetailSchema } from "./SendTrialWillEndEmail.types";

export const sendTrialWillEndEmail =
	(deps: SendTrialWillEndEmailDependencies) =>
	async (event: SendTrialWillEndEmailEvent): Promise<void> => {
		const { sesClient, logger, config } = deps;
		const context = {
			requestId: event.id,
			functionName: "sendTrialWillEndEmail",
		};

		let detail: z.infer<typeof SendTrialWillEndEmailDetailSchema>;
		try {
			detail = SendTrialWillEndEmailDetailSchema.parse(event.detail);
		} catch (error) {
			logger.error("Invalid SendTrialWillEndEmail payload", {
				...context,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new Error("Invalid SendTrialWillEndEmail payload");
		}

		const displayName =
			detail.customerName?.trim() ||
			detail.customerEmail.split("@")[0] ||
			"there";

		const subject = "Your CDK Insights trial ends soon";
		const htmlBody = trialWillEndHtml(
			displayName,
			detail.trialEnd,
			detail.upgradeUrl,
		);
		const textBody = `Hi ${displayName},

Just a reminder that your CDK Insights trial ends on ${new Date(detail.trialEnd * 1000).toDateString()}.

Upgrade here: ${detail.upgradeUrl}
`;

		logger.info("Sending trial will end email", {
			...context,
			stripeSubscriptionId: detail.stripeSubscriptionId,
			stripeCustomerId: detail.stripeCustomerId,
			to: detail.customerEmail,
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

		logger.success("Trial will end email sent", {
			...context,
			to: detail.customerEmail,
			stripeSubscriptionId: detail.stripeSubscriptionId,
		});
	};
