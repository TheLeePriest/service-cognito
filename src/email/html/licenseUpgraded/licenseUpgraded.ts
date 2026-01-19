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
  <title>License Upgrade Confirmed - CDK Insights</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background-color:transparent; font-family:'Raleway', sans-serif; color:#fcf9f4; line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000d0a">
    <tr>
      <td align="center">
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="max-width:600px; width:100%; background-color:#000d0a; box-shadow:0 4px 6px rgba(0,0,0,0.1);"
        >
          <tr>
            <td align="center" style="padding:30px 20px; background-color:#000d0a;">
              <img
                src="https://cdk-insights.s3.eu-west-2.amazonaws.com/cdk-insights-cube.png"
                alt="CDK Insights Logo"
                width="100"
                style="
                  display:block;
                  border:0;
                  outline:none;
                  text-decoration:none;
                  width:100px;
                  max-width:100%;
                  height:auto;
                  margin-bottom:20px;
                "
              />
              <h1 style="margin:0; font-size:36px; font-weight:bold;">
                Upgrade Complete!
              </h1>
            </td>
          </tr>

          <!-- Greeting Section -->
          <tr>
            <td style="background-color:#000d0a; padding:20px;">
              <h2 style="margin:0; font-size:28px; font-weight:bold; text-align:center;">
                Hi there ${safeDisplayName},
              </h2>
              <p style="text-align:center; margin:10px 0;">
                ${upgradeMessage}
              </p>
            </td>
          </tr>

          <!-- Upgrade Details Section -->
          <tr>
            <td style="background-color:#00140f; padding:20px;">
              <h2 style="margin:0; font-size:28px; font-weight:bold; text-align:center;">
                Your Upgrade Details
              </h2>
              <div style="background-color:#515A58; padding:20px; border-radius:12px; margin:20px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:10px 0;">
                      <strong>Plan:</strong> ${safeProductName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;">
                      <strong>Status:</strong> <span style="color:#5da38a;">Active</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- What's New Section -->
          <tr>
            <td style="background-color:#000d0a; padding:20px;">
              <h2 style="margin:0; font-size:28px; font-weight:bold; text-align:center;">
                What's Unlocked
              </h2>
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="margin:20px 0; padding:0 20px;"
              >
                <tr>
                  <td align="center" width="33%" style="padding:10px;">
                    <div style="font-size:24px; margin-bottom:10px;" aria-hidden="true" role="presentation">
                      Unlimited
                    </div>
                    <p style="margin:0;">Resource Analysis</p>
                  </td>
                  <td align="center" width="33%" style="padding:10px;">
                    <div style="font-size:24px; margin-bottom:10px;" aria-hidden="true" role="presentation">
                      Advanced
                    </div>
                    <p style="margin:0;">AI Insights</p>
                  </td>
                  <td align="center" width="33%" style="padding:10px;">
                    <div style="font-size:24px; margin-bottom:10px;" aria-hidden="true" role="presentation">
                      Priority
                    </div>
                    <p style="margin:0;">Support</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Next Steps Section -->
          <tr>
            <td style="background-color:#00140f; padding:20px;">
              <h2 style="margin:0; font-size:28px; font-weight:bold; text-align:center;">
                Next Steps
              </h2>
              <ol style="padding-left:40px; margin:10px 0;">
                <li>Your license has been automatically activated</li>
                <li>Continue analyzing your CDK stacks with no trial limits</li>
                <li>Access advanced features in your dashboard</li>
                <li>Reach out to support if you need any assistance</li>
              </ol>
              <div style="text-align:center; margin:20px 0;">
                <a
                  href="https://cdkinsights.dev/dashboard"
                  style="
                    display:inline-block;
                    background-color:#5da38a;
                    color:#fcf9f4 !important;
                    text-decoration:none;
                    padding:12px 44px;
                    border-radius:12px;
                    margin-top:20px;
                  "
                >
                  Go to Dashboard
                </a>
              </div>
            </td>
          </tr>

          <!-- Support Section -->
          <tr>
            <td style="background-color:#000d0a; padding:20px;">
              <h2 style="margin:0; font-size:28px; font-weight:bold; text-align:center;">
                Need Help?
              </h2>
              <p style="text-align:center; margin:10px 0;">
                Our support team is here to help you get the most out of CDK Insights.
                Don't hesitate to reach out if you have any questions!
              </p>
              <p style="text-align:center; margin:10px 0;">
                <a href="mailto:support@cdkinsights.dev" style="color:#5da38a;">support@cdkinsights.dev</a><br />
                <a href="https://docs.cdkinsights.dev" style="color:#5da38a;">Documentation</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#000d0a; padding:20px; text-align:center;">
              <div style="font-size:12px; color:#fcf9f4;">
                &copy; 2025 CDK Insights. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
