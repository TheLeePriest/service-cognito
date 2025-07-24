import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from "@aws-sdk/client-cognito-identity-provider";
import { logger } from "../src/shared/logging/logger";

// Configuration
const USER_POOL_ID = process.env.USER_POOL_ID || "eu-west-1_xxxxxxxxx";

async function checkCognitoConfig() {
  const client = new CognitoIdentityProviderClient({ region: "eu-west-1" });
  
  try {
    logger.info("Checking Cognito User Pool configuration", { userPoolId: USER_POOL_ID });
    
    const command = new DescribeUserPoolCommand({
      UserPoolId: USER_POOL_ID,
    });

    const response = await client.send(command);
    const userPool = response.UserPool;
    
    console.log("🔍 Cognito User Pool Configuration:");
    console.log("=".repeat(50));
    console.log("🏊 User Pool ID:", userPool?.Id);
    console.log("📝 Name:", userPool?.Name);
    console.log("📧 Email Configuration:");
    console.log("  - Email Sending Account:", userPool?.EmailConfiguration?.EmailSendingAccount);
    console.log("  - From Email Address:", userPool?.EmailConfiguration?.From);
    console.log("  - Reply To Email Address:", userPool?.EmailConfiguration?.ReplyToEmailAddress);
    console.log("  - Source ARN:", userPool?.EmailConfiguration?.SourceArn);
    
    console.log("\n📨 Message Configuration:");
    console.log("  - SMS Configuration:", userPool?.SmsConfiguration ? "Configured" : "Not Configured");
    console.log("  - Email Configuration:", userPool?.EmailConfiguration ? "Configured" : "Not Configured");
    
    console.log("\n🔐 Sign-up Experience:");
    console.log("  - Self Sign-up Enabled:", userPool?.AdminCreateUserConfig?.AllowAdminCreateUserOnly ? "No" : "Yes");
    console.log("  - Email Verification Required:", userPool?.VerificationMessageTemplate?.DefaultEmailOption === "CONFIRM_WITH_CODE" ? "Yes" : "No");
    
    console.log("\n📋 Lambda Triggers:");
    const triggers = userPool?.LambdaConfig;
    if (triggers) {
      console.log("  - Pre Sign-up:", triggers.PreSignUp ? "Configured" : "Not Configured");
      console.log("  - Custom Message:", triggers.CustomMessage ? "Configured" : "Not Configured");
      console.log("  - Post Confirmation:", triggers.PostConfirmation ? "Configured" : "Not Configured");
      console.log("  - Pre Authentication:", triggers.PreAuthentication ? "Configured" : "Not Configured");
      console.log("  - Post Authentication:", triggers.PostAuthentication ? "Configured" : "Not Configured");
      console.log("  - Define Auth Challenge:", triggers.DefineAuthChallenge ? "Configured" : "Not Configured");
      console.log("  - Create Auth Challenge:", triggers.CreateAuthChallenge ? "Configured" : "Not Configured");
      console.log("  - Verify Auth Challenge:", triggers.VerifyAuthChallengeResponse ? "Configured" : "Not Configured");
      console.log("  - Pre Token Generation:", triggers.PreTokenGeneration ? "Configured" : "Not Configured");
      console.log("  - User Migration:", triggers.UserMigration ? "Configured" : "Not Configured");
    }
    
    // Analysis
    console.log("\n🔍 Analysis:");
    const emailConfig = userPool?.EmailConfiguration;
    if (emailConfig?.EmailSendingAccount === "COGNITO_DEFAULT") {
      console.log("✅ Using Cognito's default email service");
      console.log("💡 Note: Limited to 50 emails/day by default");
    } else if (emailConfig?.EmailSendingAccount === "DEVELOPER") {
      console.log("✅ Using SES for email sending");
      console.log("💡 Check SES configuration and quotas");
    } else {
      console.log("⚠️  Email configuration not properly set up");
    }
    
    if (userPool?.LambdaConfig?.CustomMessage) {
      console.log("✅ Custom Message Lambda trigger is configured");
      console.log("💡 Check Lambda function logs for any errors");
    } else {
      console.log("ℹ️  No Custom Message Lambda trigger configured");
    }
    
  } catch (error) {
    logger.error("Failed to check Cognito configuration", { error });
    console.error("❌ Failed to check Cognito configuration:", error);
  }
}

// Run the check
checkCognitoConfig(); 