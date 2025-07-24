import { CognitoIdentityProviderClient, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { logger } from "../src/shared/logging/logger";

// Configuration
const USER_POOL_ID = process.env.USER_POOL_ID || "eu-west-1_xxxxxxxxx";
const TEST_EMAIL = process.env.TEST_EMAIL || "license-test@example.com";
const TEST_NAME = process.env.TEST_NAME || "License Test User";

async function simulateLicensePurchase() {
  const client = new CognitoIdentityProviderClient({ region: "eu-west-1" });
  
  try {
    logger.info("Simulating license purchase user creation", { email: TEST_EMAIL, name: TEST_NAME });
    
    // This simulates what should happen when someone purchases a license
    const command = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: TEST_EMAIL,
      UserAttributes: [
        {
          Name: "email",
          Value: TEST_EMAIL,
        },
        {
          Name: "email_verified",
          Value: "true", // Mark as verified since they purchased a license
        },
        {
          Name: "name",
          Value: TEST_NAME,
        },
        {
          Name: "custom:subscriptionTier",
          Value: "pro", // Simulate pro license
        },
      ],
      MessageAction: "RESEND", // This is crucial - must be RESEND to send email
      DesiredDeliveryMediums: ["EMAIL"], // Only send email, not SMS
    });

    const response = await client.send(command);
    
    logger.info("License purchase user created successfully", { 
      userId: response.User?.Username,
      userStatus: response.User?.UserStatus 
    });
    
    console.log("✅ License purchase simulation completed!");
    console.log("📧 Email should be sent to:", TEST_EMAIL);
    console.log("🔗 User Pool ID:", USER_POOL_ID);
    console.log("👤 User:", TEST_EMAIL);
    console.log("🔄 User Status:", response.User?.UserStatus);
    console.log("📨 Message Action:", "RESEND");
    console.log("💡 Check your email for the invitation message");
    
    // Check if user was created with correct attributes
    const userAttributes = response.User?.Attributes;
    if (userAttributes) {
      console.log("\n📋 User Attributes:");
      for (const attr of userAttributes) {
        console.log(`  - ${attr.Name}: ${attr.Value}`);
      }
    }
    
  } catch (error) {
    logger.error("Failed to simulate license purchase", { error });
    console.error("❌ Failed to simulate license purchase:", error);
    
    // Check if it's a MessageAction error
    if (error instanceof Error && error.message.includes("MessageAction")) {
      console.log("\n💡 This might be a MessageAction configuration issue");
      console.log("🔧 Check your Cognito User Pool settings");
    }
  }
}

// Run the simulation
simulateLicensePurchase(); 