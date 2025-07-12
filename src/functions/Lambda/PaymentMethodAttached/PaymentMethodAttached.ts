import { AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import type {
  PaymentMethodAttachedEvent,
  PaymentMethodAttachedDependencies,
} from "./PaymentMethodAttached.types";

export const paymentMethodAttached =
  ({
    userPoolId,
    cognitoClient,
    eventBridge,
    eventBusName,
    logger,
  }: PaymentMethodAttachedDependencies) =>
  async (event: PaymentMethodAttachedEvent) => {
    const { detail } = event;
    const {
      stripeCustomerId,
      stripePaymentMethodId,
      paymentMethodType,
      createdAt,
      customerData,
    } = detail;

    logger.info("Processing payment method attached for Cognito", {
      customerId: stripeCustomerId,
      paymentMethodId: stripePaymentMethodId,
      paymentMethodType,
    });

    try {
      // Update user attributes in Cognito
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: userPoolId,
          Username: customerData.email,
          UserAttributes: [
            {
              Name: "custom:payment_method_id",
              Value: stripePaymentMethodId,
            },
            {
              Name: "custom:payment_method_type",
              Value: paymentMethodType,
            },
            {
              Name: "custom:payment_method_attached_at",
              Value: new Date().toISOString(),
            },
          ],
        }),
      );

      // Emit payment method attached event
      await eventBridge.putEvent(
        eventBusName,
        "service.cognito",
        "CognitoPaymentMethodAttached",
        {
          customerId: stripeCustomerId,
          customerEmail: customerData.email,
          paymentMethodId: stripePaymentMethodId,
          paymentMethodType,
          attachedAt: new Date().toISOString(),
        },
      );

      logger.info("Cognito payment method attached processed", {
        customerId: stripeCustomerId,
        customerEmail: customerData.email,
        paymentMethodId: stripePaymentMethodId,
      });
    } catch (error) {
      logger.error("Error processing Cognito payment method attached", {
        customerId: stripeCustomerId,
        paymentMethodId: stripePaymentMethodId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }; 