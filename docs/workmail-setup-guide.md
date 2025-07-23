# WorkMail Setup Guide for CDK Insights

This guide will help you set up AWS WorkMail for professional email addresses and integrate them with Cognito.

## 🎯 **Overview**

WorkMail will provide you with:
- **Professional email addresses** like `support@dev.cdkinsights.dev`
- **Catch-all functionality** for customer inquiries
- **Integration with SES** for sending emails
- **Proper email management** for customer support

## 🚀 **Step 1: Set Up WorkMail Organization**

### 1.1 Access WorkMail Console
1. Go to [AWS WorkMail Console](https://workmail.console.aws.amazon.com/)
2. Select your region (eu-west-2 for dev)
3. Click **Create organization**

### 1.2 Create Organization
1. **Organization alias**: `cdk-insights-dev` (for dev environment)
2. **Directory**: Choose "Create a new directory" or use existing
3. **Domain**: `dev.cdkinsights.dev` (for dev) or `cdkinsights.dev` (for prod)
4. **Enable interoperability**: ✅ Yes
5. Click **Create organization**

### 1.3 Wait for Setup
- Organization creation takes 5-10 minutes
- You'll receive an email when setup is complete

## 👥 **Step 2: Create Email Users**

### 2.1 Create Support User
1. Go to **Users** in WorkMail console
2. Click **Create user**
3. **Display name**: `CDK Insights Support`
4. **Username**: `support`
5. **Email address**: `support@dev.cdkinsights.dev`
6. **Password**: Set a secure password
7. Click **Create user**

### 2.2 Create No-Reply User
1. Click **Create user** again
2. **Display name**: `CDK Insights System`
3. **Username**: `noreply`
4. **Email address**: `noreply@dev.cdkinsights.dev`
5. **Password**: Set a secure password
6. Click **Create user**

### 2.3 Create Catch-All Alias (Optional)
1. Go to **Users** → **support** user
2. Click **Email addresses**
3. Add alias: `@dev.cdkinsights.dev` (routes all unknown emails to support)

## 🔧 **Step 3: Configure DNS Records**

WorkMail will provide MX and other DNS records. Add these to your Route53 hosted zone:

### MX Records
```
dev.cdkinsights.dev. MX 10 mta.workmail.eu-west-2.awsapps.com.
```

### TXT Records
```
dev.cdkinsights.dev. TXT "v=spf1 include:amazonses.com ~all"
```

### CNAME Records
```
autodiscover.dev.cdkinsights.dev. CNAME autodiscover.workmail.eu-west-2.awsapps.com.
```

## 📧 **Step 4: Verify Email Addresses in SES**

Once WorkMail is set up, verify the email addresses in SES:

```bash
# Verify support email
aws ses verify-email-identity --email-address support@dev.cdkinsights.dev --region eu-west-2

# Verify noreply email
aws ses verify-email-identity --email-address noreply@dev.cdkinsights.dev --region eu-west-2
```

## 🔗 **Step 5: Update Cognito Configuration**

Once the emails are verified, update the Cognito stack:

### 5.1 Update ServiceCognitoStack.ts
```typescript
email: UserPoolEmail.withSES({
  fromEmail: stage === "dev" ? "noreply@dev.cdkinsights.dev" : "noreply@cdkinsights.dev",
  fromName: "CDK Insights",
  replyTo: stage === "dev" ? "support@dev.cdkinsights.dev" : "support@cdkinsights.dev",
  sesRegion: "eu-west-2",
  sesVerifiedDomain: stage === "dev" ? "dev.cdkinsights.dev" : "cdkinsights.dev",
}),
```

### 5.2 Deploy Updated Stack
```bash
npm run deploy:dev
```

## 🧪 **Step 6: Test Email Integration**

### 6.1 Test User Registration
1. Go to your application's sign-up page
2. Register a new user
3. Check email for verification link
4. Verify email comes from `noreply@dev.cdkinsights.dev`

### 6.2 Test Support Email
1. Send an email to `support@dev.cdkinsights.dev`
2. Check WorkMail console for received email
3. Reply to test customer support flow

## 📊 **Step 7: Monitor and Manage**

### 7.1 WorkMail Console
- **Users**: Manage email accounts
- **Groups**: Create distribution lists
- **Resources**: Manage shared calendars/contacts
- **Mobile**: Configure mobile access

### 7.2 Email Management
- **Web Client**: Access at https://workmail.console.aws.amazon.com/
- **Outlook**: Configure Outlook client
- **Mobile Apps**: Use WorkMail mobile app

## 🔐 **Step 8: Security Best Practices**

### 8.1 Password Management
- Use strong passwords for all users
- Enable MFA for admin accounts
- Regular password rotation

### 8.2 Access Control
- Limit admin access to necessary users
- Use groups for permission management
- Monitor login activity

## 🚨 **Troubleshooting**

### Common Issues

**1. Email Not Delivered**
- Check SES sending limits
- Verify email addresses in SES
- Check WorkMail organization status

**2. DNS Issues**
- Verify MX records are correct
- Check TXT records for SPF
- Wait for DNS propagation (up to 48 hours)

**3. WorkMail Organization Not Created**
- Check directory service status
- Verify domain ownership
- Contact AWS support if needed

## 💰 **Cost Considerations**

### WorkMail Pricing (eu-west-2)
- **$4.00 per user per month**
- **50GB storage per user**
- **No setup fees**

### Estimated Monthly Cost
- **Dev Environment**: $8/month (2 users)
- **Production**: $8/month (2 users)
- **Total**: $16/month for both environments

## 🎯 **Next Steps**

1. **Set up WorkMail organization** following this guide
2. **Create email users** for support and noreply
3. **Verify emails in SES** using the provided commands
4. **Update Cognito configuration** to use WorkMail emails
5. **Test email functionality** thoroughly
6. **Monitor usage** and adjust as needed

## 📞 **Support**

If you encounter issues:
1. Check AWS WorkMail documentation
2. Review CloudWatch logs for errors
3. Contact AWS support if needed
4. Check SES console for delivery status 