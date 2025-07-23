#!/bin/bash

# Test SES Integration with Cognito
echo "🧪 Testing SES integration with Cognito..."

# Get the stage from environment or default to dev
STAGE=${STAGE:-"dev"}
SERVICE_NAME=${SERVICE_NAME:-"service-cognito"}

echo "📋 Configuration:"
echo "  Stage: $STAGE"
echo "  Service: $SERVICE_NAME"

# Get the User Pool ID
echo "🔍 Getting User Pool ID..."
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name ServiceCognitoStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text 2>/dev/null)

if [[ -z "$USER_POOL_ID" || "$USER_POOL_ID" == "None" ]]; then
  echo "❌ Could not find User Pool ID. Stack may not be deployed."
  exit 1
fi

echo "✅ Found User Pool ID: $USER_POOL_ID"

# Get User Pool details
echo "📋 User Pool Configuration:"
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID \
  --query 'UserPool.{Name:Name,EmailConfiguration:EmailConfiguration,VerificationMessageTemplate:VerificationMessageTemplate}' \
  --output table

# Check SES configuration
echo ""
echo "🔍 Checking SES Configuration..."

# Get the domain for this stage
if [[ "$STAGE" == "dev" ]]; then
  DOMAIN="dev.cdkinsights.dev"
  FROM_EMAIL="noreply@dev.cdkinsights.dev"
else
  DOMAIN="cdkinsights.dev"
  FROM_EMAIL="noreply@cdkinsights.dev"
fi

echo "📋 Expected Configuration:"
echo "  Domain: $DOMAIN"
echo "  From Email: $FROM_EMAIL"

# Check if SES identity exists
echo ""
echo "🔍 Checking SES Identity..."
SES_IDENTITY=$(aws ses get-identity-verification-attributes \
  --identities $DOMAIN \
  --query "VerificationAttributes.$DOMAIN.VerificationStatus" \
  --output text 2>/dev/null)

if [[ "$SES_IDENTITY" == "Success" ]]; then
  echo "✅ SES Identity verified: $DOMAIN"
else
  echo "❌ SES Identity not verified: $DOMAIN"
  echo "💡 You may need to verify the domain in SES first"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Deploy the updated Cognito stack"
echo "2. Test Cognito user registration to see custom emails"
echo "3. Check CloudWatch logs for email delivery status"
echo ""
echo "🎉 SES integration test complete!" 