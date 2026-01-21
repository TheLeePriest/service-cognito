import { escapeHtml } from "../../../shared/utils/htmlSanitizer";

export const licenseUpgradedHtml = (
  displayName: string,
  productName: string,
  upgradeType: string,
) => {
  // SECURITY: Escape HTML to prevent XSS attacks via user input
  const safeDisplayName = escapeHtml(displayName);
  const safeProductName = escapeHtml(productName);

  // Determine upgrade message based on type
  const upgradeMessage = upgradeType === "trial_to_paid"
    ? "You've successfully upgraded from your free trial to a paid subscription."
    : "Your subscription has been upgraded successfully.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>License Upgrade Confirmed - CDK Insights</title>
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
                Upgrade Complete
              </h1>
              <p style="margin: 0; font-size: 17px; color: #a8b5b0; line-height: 1.6;">
                Hi ${safeDisplayName}, ${upgradeMessage}
              </p>
            </td>
          </tr>

          <!-- Plan Card -->
          <tr>
            <td style="padding: 0 24px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #00140f; border-radius: 16px;">
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #88c1a8;">
                      Your Plan
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #fcf9f4;">
                      ${safeProductName}
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #a8b5b0;">Status</p>
                          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #88c1a8;">Active</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What's Unlocked -->
          <tr>
            <td style="padding: 0 24px 40px 24px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #fcf9f4;">
                What's unlocked
              </h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="32" valign="top">
                    <div style="width: 24px; height: 24px; background-color: #5da38a; border-radius: 50%; text-align: center; line-height: 24px; font-size: 14px; color: #000d0a;">✓</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #fcf9f4;">Unlimited resource analysis</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="32" valign="top">
                    <div style="width: 24px; height: 24px; background-color: #5da38a; border-radius: 50%; text-align: center; line-height: 24px; font-size: 14px; color: #000d0a;">✓</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #fcf9f4;">Advanced AI insights</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="32" valign="top">
                    <div style="width: 24px; height: 24px; background-color: #5da38a; border-radius: 50%; text-align: center; line-height: 24px; font-size: 14px; color: #000d0a;">✓</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <p style="margin: 0; font-size: 15px; font-weight: 600; color: #fcf9f4;">Priority support</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 48px 24px;">
              <a
                href="https://cdkinsights.dev/dashboard"
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
                Go to Dashboard
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
