import { escapeHtml } from "../../../shared/utils/htmlSanitizer";

export const userInvitationHtml = (displayName: string) => {
  // SECURITY: Escape HTML to prevent XSS attacks via user input
  const safeDisplayName = escapeHtml(displayName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Welcome to CDK Insights</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #000d0a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000d0a">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="max-width: 520px; width: 100%;"
        >
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 0 0 48px 0;">
              <img
                src="https://cdk-insights.s3.eu-west-2.amazonaws.com/cdk-insights-cube.png"
                alt="CDK Insights"
                width="72"
                style="display: block; border: 0; width: 72px; height: auto;"
              />
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td align="center" style="padding: 0 24px 48px 24px;">
              <h1 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 700; color: #fcf9f4; line-height: 1.2;">
                Welcome to CDK Insights
              </h1>
              <!-- Cognito requires {username} placeholder to be present for {####} to work -->
              <span style="display:none;">{username}</span>
              <p style="margin: 0; font-size: 17px; color: #a8b5b0; line-height: 1.6;">
                Hi ${safeDisplayName}, your account is ready. Start analyzing your AWS CDK infrastructure in minutes.
              </p>
            </td>
          </tr>

          <!-- Credentials Card -->
          <tr>
            <td style="padding: 0 24px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #00140f; border-radius: 16px;">
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #88c1a8;">
                      Your Temporary Password
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; font-family: 'SF Mono', Monaco, 'Courier New', monospace; color: #fcf9f4; letter-spacing: 1px;">
                      {####}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #a8b5b0; line-height: 1.5;">
                      You'll be prompted to create a new password when you sign in for the first time.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Getting Started -->
          <tr>
            <td style="padding: 0 24px 40px 24px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #fcf9f4;">
                Get started
              </h2>
              
              <!-- Step 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="32" valign="top">
                    <div style="width: 24px; height: 24px; background-color: #5da38a; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; font-weight: 600; color: #000d0a;">1</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #fcf9f4;">Sign in to your dashboard</p>
                    <p style="margin: 0; font-size: 14px; color: #a8b5b0;">Use your email and temporary password</p>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="32" valign="top">
                    <div style="width: 24px; height: 24px; background-color: #5da38a; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; font-weight: 600; color: #000d0a;">2</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #fcf9f4;">Create a new password</p>
                    <p style="margin: 0; font-size: 14px; color: #a8b5b0;">You'll be prompted on first login</p>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="32" valign="top">
                    <div style="width: 24px; height: 24px; background-color: #5da38a; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; font-weight: 600; color: #000d0a;">3</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #fcf9f4;">Start analyzing</p>
                    <p style="margin: 0; font-size: 14px; color: #a8b5b0;">Access your full CDK Insights dashboard</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 48px 24px;">
              <a
                href="https://cdkinsights.dev/login"
                style="
                  display: inline-block;
                  background-color: #5da38a;
                  color: #000d0a;
                  text-decoration: none;
                  padding: 16px 32px;
                  border-radius: 12px;
                  font-size: 16px;
                  font-weight: 600;
                "
              >
                Sign in to CDK Insights
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 24px;">
              <div style="height: 1px; background-color: #1a2f28;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 24px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #a8b5b0;">
                Questions? We're here to help.
              </p>
              <a href="mailto:support@cdkinsights.dev" style="font-size: 14px; color: #88c1a8; text-decoration: none;">
                support@cdkinsights.dev
              </a>
              <p style="margin: 24px 0 0 0; font-size: 12px; color: #586970;">
                © ${new Date().getFullYear()} CDK Insights. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
