import type { CustomMessageTriggerEvent } from "aws-lambda";
import { userInvitationHtml } from "../../../../email/html/userInvitation/userInvitation";

export const userInvitation = async (
	event: CustomMessageTriggerEvent,
): Promise<CustomMessageTriggerEvent> => {
	console.log(event, "event");
	const trigger = event.triggerSource;
	const firstName = event.request.userAttributes.name.split(" ")[0] || "";
	console.log(trigger, "trigger");
	if (
		trigger === "CustomMessage_AdminCreateUser" ||
		trigger === "CustomMessage_SignUp"
	) {
		event.response.emailSubject = `Welcome to CDK-Insights, ${firstName}!`;
		event.response.emailMessage = userInvitationHtml(firstName);
	}
	return event;
};
