import { CognitoIdentityProviderClient, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { logger } from "../src/shared/logging/logger";

// Configuration
const USER_POOL_ID = process.env.USER_POOL_ID || "eu-west-1_xxxxxxxxx";
const USER_EMAIL = process.env.USER_EMAIL || "test@example.com";

async function checkUserStatus() {
  const client = new CognitoIdentityProviderClient({ region: "eu-west-1" });
  
  try {
    logger.info("Checking user status in Cognito", { email: USER_EMAIL });
    
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: USER_EMAIL,
    });

    const response = await client.send(command);
    
    console.log("🔍 User Status Check Results:");
    console.log("=".repeat(50));
    console.log("👤 Username:", response.Username);
    console.log("📧 Email:", response.UserAttributes?.find(attr => attr.Name === "email")?.Value);
    console.log("✅ Email Verified:", response.UserAttributes?.find(attr => attr.Name === "email_verified")?.Value);
    console.log("📱 Phone:", response.UserAttributes?.find(attr => attr.Name === "phone_number")?.Value);
    console.log("📱 Phone Verified:", response.UserAttributes?.find(attr => attr.Name === "phone_number_verified")?.Value);
    console.log("🔄 User Status:", response.UserStatus);
    console.log("📅 Enabled:", response.Enabled);
    console.log("📅 Created:", response.UserCreateDate);
    console.log("📅 Modified:", response.UserLastModifiedDate);
    
    // Check if email is verified
    const emailVerified = response.UserAttributes?.find(attr => attr.Name === "email_verified")?.Value === "true";
    const userStatus = response.UserStatus;
    
    console.log("\n🔍 Analysis:");
    if (userStatus === "FORCE_CHANGE_PASSWORD") {
      console.log("⚠️  User status is FORCE_CHANGE_PASSWORD - this prevents email sending");
      console.log("💡 Solution: User needs to sign in and change password first");
    } else if (!emailVerified) {
      console.log("⚠️  Email is not verified - this may prevent email sending");
      console.log("💡 Solution: Verify the email address");
    } else {
      console.log("✅ User appears to be properly configured for email sending");
    }
    
  } catch (error) {
    logger.error("Failed to check user status", { error });
    console.error("❌ Failed to check user status:", error);
  }
}

// Run the check
checkUserStatus(); 