import { escapeHtml, sanitizeUrl, getPreferencesUrl, CDK_INSIGHTS_ALLOWED_DOMAINS } from "../../../shared/utils/htmlSanitizer";

export interface UsageSummaryData {
  totalScans: number;
  totalResources: number;
  issuesFound: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  topServices: Array<{ name: string; count: number }>;
}

export const monthlyUsageSummaryHtml = (
  displayName: string,
  month: string,
  year: string,
  usage: UsageSummaryData,
  dashboardUrl: string,
): string => {
  const safeDisplayName = escapeHtml(displayName);
  const safeMonth = escapeHtml(month);
  const safeYear = escapeHtml(year);
  const safeDashboardUrl = sanitizeUrl(dashboardUrl, CDK_INSIGHTS_ALLOWED_DOMAINS);
  const safePreferencesUrl = getPreferencesUrl(dashboardUrl);

  const topServicesHtml = usage.topServices.slice(0, 5).map(service => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #1a2f28;">
        <span style="font-size: 14px; color: #fcf9f4;">${escapeHtml(service.name)}</span>
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #1a2f28; text-align: right;">
        <span style="font-size: 14px; color: #a8b5b0;">${service.count} resources</span>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Monthly Usage Summary - CDK Insights</title>
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
                Your ${safeMonth} Summary
              </h1>
              <p style="margin: 0; font-size: 17px; color: #a8b5b0; line-height: 1.6;">
                Hi ${safeDisplayName}, here's your CDK Insights usage summary for ${safeMonth} ${safeYear}.
              </p>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 0 24px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Total Scans -->
                  <td width="50%" style="padding-right: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #00140f; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: #5da38a;">${usage.totalScans}</p>
                          <p style="margin: 0; font-size: 12px; color: #a8b5b0;">Scans Run</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Total Resources -->
                  <td width="50%" style="padding-left: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #00140f; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: #5da38a;">${usage.totalResources.toLocaleString()}</p>
                          <p style="margin: 0; font-size: 12px; color: #a8b5b0;">Resources Analyzed</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Issues Found Card -->
          <tr>
            <td style="padding: 0 24px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #00140f; border-radius: 16px;">
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #88c1a8;">
                      Issues Identified
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 32px; font-weight: 700; color: #fcf9f4;">
                      ${usage.issuesFound}
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="25%" style="text-align: center;">
                          <p style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #e57373;">${usage.criticalIssues}</p>
                          <p style="margin: 0; font-size: 11px; color: #a8b5b0;">Critical</p>
                        </td>
                        <td width="25%" style="text-align: center;">
                          <p style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #f4a261;">${usage.highIssues}</p>
                          <p style="margin: 0; font-size: 11px; color: #a8b5b0;">High</p>
                        </td>
                        <td width="25%" style="text-align: center;">
                          <p style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #ffd166;">${usage.mediumIssues}</p>
                          <p style="margin: 0; font-size: 11px; color: #a8b5b0;">Medium</p>
                        </td>
                        <td width="25%" style="text-align: center;">
                          <p style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #88c1a8;">${usage.lowIssues}</p>
                          <p style="margin: 0; font-size: 11px; color: #a8b5b0;">Low</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Services -->
          ${usage.topServices.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 40px 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #fcf9f4;">
                Top Services Analyzed
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${topServicesHtml}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 48px 24px;">
              <a
                href="${safeDashboardUrl}"
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
                View Full Report
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
