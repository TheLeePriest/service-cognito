import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { logger } from "../src/shared/logging/logger";

// Configuration
const USER_POOL_ID = process.env.USER_POOL_ID || "eu-west-1_xxxxxxxxx";
const USER_EMAIL = process.env.USER_EMAIL || "test@example.com";
const NEW_PASSWORD = process.env.NEW_PASSWORD || "TempPassword123!";

async function fixUserEmail() {
  const client = new CognitoIdentityProviderClient({ region: "eu-west-1" });
  
  try {
    logger.info("Fixing user email configuration", { email: USER_EMAIL });
    
    // Step 1: Mark email as verified
    console.log("🔧 Step 1: Marking email as verified...");
    const verifyCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: USER_EMAIL,
      UserAttributes: [
        {
          Name: "email_verified",
          Value: "true",
        },
      ],
    });

    await client.send(verifyCommand);
    console.log("✅ Email marked as verified");
    
    // Step 2: Set a permanent password to change status from FORCE_CHANGE_PASSWORD
    console.log("🔧 Step 2: Setting permanent password...");
    const passwordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: USER_EMAIL,
      Password: NEW_PASSWORD,
      Permanent: true, // This changes status from FORCE_CHANGE_PASSWORD to CONFIRMED
    });

    await client.send(passwordCommand);
    console.log("✅ Password set as permanent");
    
    console.log("\n🎉 User email configuration fixed!");
    console.log("📧 Email:", USER_EMAIL);
    console.log("🔑 Temporary Password:", NEW_PASSWORD);
    console.log("💡 User should now be able to receive emails");
    console.log("⚠️  User should change password on first login");
    
  } catch (error) {
    logger.error("Failed to fix user email", { error });
    console.error("❌ Failed to fix user email:", error);
  }
}

// Run the fix
fixUserEmail(); 