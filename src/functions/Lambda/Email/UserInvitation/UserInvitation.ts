import type { CustomMessageTriggerEvent } from "aws-lambda";
import { logger } from "../../../../shared/logging/logger";
import { userInvitationHtml } from "../../../../email/html/userInvitation/userInvitation";

export const userInvitation = async (event: CustomMessageTriggerEvent) => {
  const requestId = `user-invitation-${Date.now()}`;
  const context = { requestId, functionName: "userInvitation" };
  
  logger.logFunctionStart("userInvitation", context);
  logger.info("Processing user invitation event", context, { triggerSource: event.triggerSource });

  const trigger = event.triggerSource;
  logger.info("Trigger source", context, { trigger });

  // Handle different trigger sources
  if (trigger === "CustomMessage_AdminCreateUser") {
    // Customize the email for admin-created users
    const displayName = event.request.userAttributes?.name || 
                       event.request.userAttributes?.given_name || 
                       event.request.userAttributes?.email?.split('@')[0] || 
                       "User";
    
    logger.info("Customizing admin create user email", context, { displayName });
    
    // Set custom email subject and message
    event.response.emailSubject = "Welcome to CDK-Insights - Your Account is Ready!";
    event.response.emailMessage = userInvitationHtml(displayName);
  }

  logger.logFunctionEnd("userInvitation", Date.now(), context);
  return event;
};
