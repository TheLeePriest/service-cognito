# SES Integration with Cognito Guide

## 🎯 Overview

This guide explains how to deploy and test the SES (Simple Email Service) integration with Amazon Cognito for custom email delivery.

## 📋 Prerequisites

1. ✅ **Certificate validated** (completed)
2. ✅ **SES Identity created** in infrastructure stack
3. ✅ **Domain verified** in SES

## 🚀 Deployment Steps

### 1. Deploy Infrastructure Stack (if not already done)

```bash
cd service-cdk-insights-infrastructure
npm run cdk deploy:dev  # or deploy:prod
```

### 2. Deploy Cognito Stack with SES Integration

```bash
cd service-cognito
npm run cdk deploy:dev  # or deploy:prod
```

### 3. Verify SES Configuration

```bash
# Run the test script
./scripts/test-ses-integration.sh
```

## 🔧 Configuration Details

### Email Configuration

The Cognito stack is now configured to use SES with the following settings:

- **Dev Environment:**
  - From: `noreply@dev.cdkinsights.dev`
  - Reply-To: `support@dev.cdkinsights.dev`
  - Domain: `dev.cdkinsights.dev`

- **Production Environment:**
  - From: `noreply@cdkinsights.dev`
  - Reply-To: `support@cdkinsights.dev`
  - Domain: `cdkinsights.dev`

## 🧪 Testing the Integration

### 1. Test User Registration

1. Go to your application's sign-up page
2. Register a new user with a valid email
3. Check the email for verification link
4. Verify the email is from your custom domain

### 2. Test Password Reset

1. Use the "Forgot Password" feature
2. Check email for reset link
3. Verify the email branding

## 📊 Monitoring

### CloudWatch Logs

Check these log groups for email delivery status:

```bash
# User invitation emails
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/service-cognito-user-invitation-email"

# Cognito email delivery
aws logs describe-log-groups --log-group-name-prefix "/aws/cognito"
```

## 🔍 Troubleshooting

### Common Issues

1. **SES in Sandbox Mode**
   - Only verified emails can receive emails
   - Request production access if needed

2. **Domain Not Verified**
   - Check SES console for domain verification status
   - Ensure DNS records are properly configured

3. **Email Not Delivered**
   - Check CloudWatch logs
   - Verify SES sending limits
   - Check spam/junk folders

## 🎨 Custom Email Templates

The integration includes custom email templates for:

- **User Invitation**: Custom HTML template with branding
- **Verification**: Standard Cognito template with custom styling
- **Password Reset**: Standard Cognito template

## 📈 Next Steps

1. **Monitor email delivery rates**
2. **Set up CloudWatch alarms** for bounce/complaint rates
3. **Request SES production access** if needed
4. **Customize email templates** further 