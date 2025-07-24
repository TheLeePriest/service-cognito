import { userInvitationHtml } from "../src/email/html/userInvitation/userInvitation";
import * as fs from "node:fs";
import * as path from "node:path";

// Test the email template with sample data
const testDisplayName = "John Doe";
const htmlContent = userInvitationHtml(testDisplayName);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, "../test-output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the HTML to a file for preview
const outputPath = path.join(outputDir, "user-invitation-email.html");
fs.writeFileSync(outputPath, htmlContent);

console.log("✅ Email template generated successfully!");
console.log("📁 Output file:", outputPath);
console.log("🌐 Open this file in your browser to preview the email");

// Also log the HTML content to console for quick review
console.log("\n📧 Email HTML Preview:");
console.log("=".repeat(50));
console.log(htmlContent);
console.log("=".repeat(50)); 