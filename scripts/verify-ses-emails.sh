#!/bin/bash

# Verify SES Email Addresses for Cognito Integration
echo "🔍 Verifying SES email addresses for Cognito integration..."

# Get the stage from environment or default to dev
STAGE=${STAGE:-"dev"}

echo "📋 Configuration:"
echo "  Stage: $STAGE"

# Set email addresses based on stage
if [[ "$STAGE" == "dev" ]]; then
    DOMAIN="dev.cdkinsights.dev"
    FROM_EMAIL="noreply@dev.cdkinsights.dev"
    REPLY_TO="noreply@dev.cdkinsights.dev"
else
    DOMAIN="cdkinsights.dev"
    FROM_EMAIL="noreply@cdkinsights.dev"
    REPLY_TO="noreply@cdkinsights.dev"
fi

echo "📧 Email Configuration:"
echo "  Domain: $DOMAIN"
echo "  From Email: $FROM_EMAIL"
echo "  Reply To: $REPLY_TO"

# Check if domain is verified
echo ""
echo "🔍 Checking domain verification status..."
DOMAIN_STATUS=$(aws ses get-identity-verification-attributes \
  --identities $DOMAIN \
  --region eu-west-2 \
  --query "VerificationAttributes.$DOMAIN.VerificationStatus" \
  --output text 2>/dev/null)

if [[ "$DOMAIN_STATUS" == "Success" ]]; then
    echo "✅ Domain $DOMAIN is verified in SES"
else
    echo "❌ Domain $DOMAIN is not verified in SES"
    echo "💡 You need to verify the domain first"
    exit 1
fi

# Check if specific email addresses are verified
echo ""
echo "🔍 Checking email address verification status..."

FROM_STATUS=$(aws ses get-identity-verification-attributes \
  --identities $FROM_EMAIL \
  --region eu-west-2 \
  --query "VerificationAttributes.$FROM_EMAIL.VerificationStatus" \
  --output text 2>/dev/null)

if [[ "$FROM_STATUS" == "Success" ]]; then
    echo "✅ From email $FROM_EMAIL is verified"
else
    echo "❌ From email $FROM_EMAIL is not verified"
    echo "💡 Requesting verification for $FROM_EMAIL..."
    aws ses verify-email-identity \
      --email-address $FROM_EMAIL \
      --region eu-west-2
    echo "📧 Verification email sent to $FROM_EMAIL"
fi

REPLY_STATUS=$(aws ses get-identity-verification-attributes \
  --identities $REPLY_TO \
  --region eu-west-2 \
  --query "VerificationAttributes.$REPLY_TO.VerificationStatus" \
  --output text 2>/dev/null)

if [[ "$REPLY_STATUS" == "Success" ]]; then
    echo "✅ Reply-to email $REPLY_TO is verified"
else
    echo "❌ Reply-to email $REPLY_TO is not verified"
    echo "💡 Requesting verification for $REPLY_TO..."
    aws ses verify-email-identity \
      --email-address $REPLY_TO \
      --region eu-west-2
    echo "📧 Verification email sent to $REPLY_TO"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Check your email for verification links"
echo "2. Click the verification links in the emails"
echo "3. Wait for verification to complete (usually 5-10 minutes)"
echo "4. Run this script again to confirm verification"
echo "5. Deploy the Cognito stack with SES integration enabled"

echo ""
echo "🎯 To enable SES integration after verification:"
echo "1. Uncomment the SES configuration in ServiceCognitoStack.ts"
echo "2. Deploy the updated stack"
echo "3. Test email functionality" 