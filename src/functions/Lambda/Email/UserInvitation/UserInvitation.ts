import type { CustomMessageTriggerEvent } from "aws-lambda";
import { logger } from "../../../../shared/logging/logger";

export const userInvitation = async (event: CustomMessageTriggerEvent) => {
  const requestId = `user-invitation-${Date.now()}`;
  const context = { requestId, functionName: "userInvitation" };
  
  logger.logFunctionStart("userInvitation", context);
  logger.info("Processing user invitation event", context, { triggerSource: event.triggerSource });

  const trigger = event.triggerSource;
  logger.info("Trigger source", context, { trigger });

  // Add your custom logic here for handling user invitations
  // For example, you might want to customize the email template
  // or add additional validation

  logger.logFunctionEnd("userInvitation", Date.now(), context);
  return event;
};
