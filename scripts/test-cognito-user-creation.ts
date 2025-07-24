import { CognitoIdentityProviderClient, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { logger } from "../src/shared/logging/logger";

// Configuration
const USER_POOL_ID = process.env.USER_POOL_ID || "eu-west-1_xxxxxxxxx"; // Replace with your actual User Pool ID
const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";
const TEST_NAME = process.env.TEST_NAME || "Test User";

async function createTestUser() {
  const client = new CognitoIdentityProviderClient({ region: "eu-west-1" });
  
  try {
    logger.info("Creating test user in Cognito", { email: TEST_EMAIL, name: TEST_NAME });
    
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
          Value: "true",
        },
        {
          Name: "name",
          Value: TEST_NAME,
        },
      ],
      MessageAction: "RESEND", // This will trigger the email to be sent
    });

    const response = await client.send(command);
    
    logger.info("Test user created successfully", { 
      userId: response.User?.Username,
      userStatus: response.User?.UserStatus 
    });
    
    console.log("✅ Test user created successfully!");
    console.log("📧 Check your email for the invitation message");
    console.log("🔗 User Pool ID:", USER_POOL_ID);
    console.log("👤 User:", TEST_EMAIL);
    
  } catch (error) {
    logger.error("Failed to create test user", { error });
    console.error("❌ Failed to create test user:", error);
  }
}

// Run the test
createTestUser(); 