export const userInvitationHtml = (displayName: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to CDK-Insights</title>
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
                alt="CDK-Insights Logo"
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
                Welcome to CDK-Insights!
              </h1>
            </td>
          </tr>

          <!-- Greeting Section -->
          <tr>
            <td style="background-color:#000d0a; padding:20px;">
              <h2 style="margin:0; font-size:28px; font-weight:bold; text-align:center;">
                Hi there ${displayName} 👋🏻,
              </h2>
              <p style="text-align:center; margin:10px 0;">
                We're thrilled to welcome you to CDK-Insights! Your account has been created,
                and you're just a few steps away from enhancing your AWS CDK development
                experience.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#00140f; padding:20px;">
              <h2 style="margin:0; font-size:28px; font-weight:bold; text-align:center;">
                Important: Your Temporary Password
              </h2>
              <p style="text-align:center; margin:10px 0;">
                A temporary password has been generated for your account. You will be required
                to change this password when you log in for the first time.
              </p>
              <p
                style="
                  background-color:#515A58;
                  color:#fcf9f4;
                  padding:10px;
                  border-radius:12px;
                  text-align:center;
                  margin:10px 0;
                "
                aria-label="Temporary Password"
              >
                Temporary Password: <strong>{####}</strong>
              </p>
              <p style="text-align:center; margin:10px 0;">
                For security reasons, please ensure you change this password immediately upon
                your first login.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#000d0a; padding:20px;">
              <h2 style="margin:0; font-size:28px; font-weight:bold; text-align:center;">
                With CDK-Insights, you'll be able to:
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
                      📊
                    </div>
                    <p style="margin:0;">Gain insights on your CDK stacks</p>
                  </td>
                  <td align="center" width="33%" style="padding:10px;">
                    <div style="font-size:24px; margin-bottom:10px;" aria-hidden="true" role="presentation">
                      💰
                    </div>
                    <p style="margin:0;">Optimize your infrastructure costs</p>
                  </td>
                  <td align="center" width="33%" style="padding:10px;">
                    <div style="font-size:24px; margin-bottom:10px;" aria-hidden="true" role="presentation">
                      🔒
                    </div>
                    <p style="margin:0;">Improve security and compliance</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:#00140f; padding:20px;">
              <h2 style="margin:0; font-size:28px; font-weight:bold; text-align:center;">
                Getting Started
              </h2>
              <ol style="padding-left:40px; margin:10px 0;">
                <li>Click the button below to go to the login page</li>
                <li>Enter your email address and the temporary password provided above</li>
                <li>You will be prompted to set a new password</li>
                <li>Once your new password is set, you'll have full access to CDK-Insights</li>
              </ol>
              <div style="text-align:center; margin:20px 0;">
                <a
                  href="https://main.d3dnmattfmekt9.amplifyapp.com/login"
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
                  Log In to CDK-Insights
                </a>
              </div>
              <p style="text-align:center; margin:10px 0;">
                If you have any questions or need assistance, don't hesitate to reach out to
                our support team at support@cdk-insights.com.
              </p>
              <p style="text-align:center; margin:10px 0;">
                Best regards,<br />The CDK-Insights Team
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#000d0a; padding:20px; text-align:center;">
              <div style="font-size:12px; color:#fcf9f4;">
                &copy; 2025 CDK-Insights. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
