import {
  escapeHtml,
  sanitizeUrl,
  getPreferencesUrl,
  CDK_INSIGHTS_ALLOWED_DOMAINS,
} from "../../../shared/utils/htmlSanitizer";

export const trialWillEndHtml = (
  displayName: string,
  trialEndEpochSeconds: number,
  upgradeUrl: string,
): string => {
  // SECURITY: Escape HTML and sanitize URL to prevent XSS attacks
  const safeDisplayName = escapeHtml(displayName);
  const safeUpgradeUrl = sanitizeUrl(upgradeUrl, CDK_INSIGHTS_ALLOWED_DOMAINS);
  const safePreferencesUrl = getPreferencesUrl(upgradeUrl);

  const trialEndDate = new Date(trialEndEpochSeconds * 1000);
  const prettyDate = trialEndDate.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Your CDK Insights trial ends soon</title>
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
                Your trial ends in 3 days
              </h1>
              <p style="margin: 0; font-size: 17px; color: #a8b5b0; line-height: 1.6;">
                Hi ${safeDisplayName}, your CDK Insights trial is ending on <strong style="color: #fcf9f4;">${prettyDate}</strong>.
              </p>
            </td>
          </tr>

          <!-- Info Card -->
          <tr>
            <td style="padding: 0 24px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #00140f; border-radius: 16px;">
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #fcf9f4; line-height: 1.6;">
                      Upgrade now to keep uninterrupted access to:
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="24" valign="top">
                          <span style="color: #88c1a8;">•</span>
                        </td>
                        <td style="padding-left: 8px;">
                          <p style="margin: 0; font-size: 14px; color: #a8b5b0;">AI-powered CDK analysis</p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="24" valign="top">
                          <span style="color: #88c1a8;">•</span>
                        </td>
                        <td style="padding-left: 8px;">
                          <p style="margin: 0; font-size: 14px; color: #a8b5b0;">Security and cost insights</p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="24" valign="top">
                          <span style="color: #88c1a8;">•</span>
                        </td>
                        <td style="padding-left: 8px;">
                          <p style="margin: 0; font-size: 14px; color: #a8b5b0;">Unlimited resource scanning</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 48px 24px;">
              <a
                href="${safeUpgradeUrl}"
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
                Upgrade Now
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
              <p style="margin: 16px 0 0 0; font-size: 12px;">
                <a href="${safePreferencesUrl}" style="color: #586970; text-decoration: underline;">Manage email preferences</a>
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #586970;">
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
