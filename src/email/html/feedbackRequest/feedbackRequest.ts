import { escapeHtml, sanitizeUrl, getPreferencesUrl, CDK_INSIGHTS_ALLOWED_DOMAINS } from "../../../shared/utils/htmlSanitizer";

export const feedbackRequestHtml = (
  displayName: string,
  totalScans: number,
  feedbackUrl: string,
): string => {
  const safeDisplayName = escapeHtml(displayName);
  const safeFeedbackUrl = sanitizeUrl(feedbackUrl, CDK_INSIGHTS_ALLOWED_DOMAINS);
  const safePreferencesUrl = getPreferencesUrl(feedbackUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>We'd Love Your Feedback - CDK Insights</title>
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
                How's it going?
              </h1>
              <p style="margin: 0; font-size: 17px; color: #a8b5b0; line-height: 1.6;">
                Hi ${safeDisplayName}, you've run ${totalScans} scans with CDK Insights. We'd love to hear what you think!
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="padding: 0 24px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #00140f; border-radius: 16px;">
                <tr>
                  <td style="padding: 32px; text-align: center;">
                    <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #fcf9f4;">
                      Your feedback shapes the future of CDK Insights
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #a8b5b0; line-height: 1.6;">
                      Share your experience in a quick 2-minute survey. Your input helps us build the features that matter most to you.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What We'd Love to Know -->
          <tr>
            <td style="padding: 0 24px 40px 24px;">
              <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #fcf9f4;">
                We'd love to know
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="24" valign="top">
                    <span style="color: #88c1a8;">•</span>
                  </td>
                  <td style="padding-left: 8px;">
                    <p style="margin: 0; font-size: 15px; color: #a8b5b0;">What features do you use most?</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="24" valign="top">
                    <span style="color: #88c1a8;">•</span>
                  </td>
                  <td style="padding-left: 8px;">
                    <p style="margin: 0; font-size: 15px; color: #a8b5b0;">What would make CDK Insights even better?</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="24" valign="top">
                    <span style="color: #88c1a8;">•</span>
                  </td>
                  <td style="padding-left: 8px;">
                    <p style="margin: 0; font-size: 15px; color: #a8b5b0;">Would you recommend us to a colleague?</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 48px 24px;">
              <a
                href="${safeFeedbackUrl}"
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
                Share Your Feedback
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
                Prefer to email us directly?
              </p>
              <a href="mailto:feedback@cdkinsights.dev" style="font-size: 14px; color: #88c1a8; text-decoration: none;">
                feedback@cdkinsights.dev
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
