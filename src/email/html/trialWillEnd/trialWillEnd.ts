import {
  escapeHtml,
  sanitizeUrl,
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
  <title>Your CDK Insights trial ends soon</title>
</head>
<body style="margin:0; padding:0; background-color:#000d0a; font-family:Arial, sans-serif; color:#fcf9f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000d0a">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding:28px 20px;">
              <img
                src="https://cdk-insights.s3.eu-west-2.amazonaws.com/cdk-insights-cube.png"
                alt="CDK Insights Logo"
                width="72"
                style="display:block; border:0; outline:none; text-decoration:none; height:auto;"
              />
              <h1 style="margin:18px 0 0; font-size:26px; font-weight:700;">
                Your trial ends in 3 days
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 20px 18px;">
              <p style="margin:0; font-size:16px; line-height:1.6;">
                Hi ${safeDisplayName},
              </p>
              <p style="margin:12px 0 0; font-size:16px; line-height:1.6;">
                Just a reminder that your CDK Insights trial is due to end on <strong>${prettyDate}</strong>.
              </p>
              <p style="margin:12px 0 0; font-size:16px; line-height:1.6;">
                Upgrade now to keep uninterrupted access to AI analysis and insights.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:10px 20px 26px;">
              <a
                href="${safeUpgradeUrl}"
                style="
                  display:inline-block;
                  background-color:#5da38a;
                  color:#fcf9f4 !important;
                  text-decoration:none;
                  padding:12px 22px;
                  border-radius:10px;
                  font-size:16px;
                  font-weight:700;
                "
              >
                Upgrade now
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 20px 26px; font-size:14px; line-height:1.6; color:#cfcac3;">
              If you have any questions, reply to this email or contact
              <a href="mailto:support@cdkinsights.dev" style="color:#5da38a;">support@cdkinsights.dev</a>.
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:18px 20px; font-size:12px; color:#9a958f;">
              © 2025 CDK Insights. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

