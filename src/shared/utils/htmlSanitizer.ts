/**
 * HTML Sanitization Utilities
 *
 * Provides secure HTML escaping to prevent XSS attacks in email templates.
 */

/**
 * Escape HTML entities in a string to prevent XSS.
 * Converts dangerous characters to their HTML entity equivalents.
 *
 * @param input - The string to escape
 * @returns The escaped string safe for HTML insertion
 */
export function escapeHtml(input: string | undefined | null): string {
  if (input === null || input === undefined) {
    return "";
  }

  const str = String(input);

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Escape a string for safe use in HTML attributes.
 * More aggressive escaping for attribute contexts.
 *
 * @param input - The string to escape
 * @returns The escaped string safe for HTML attribute values
 */
export function escapeHtmlAttribute(input: string | undefined | null): string {
  if (input === null || input === undefined) {
    return "";
  }

  const str = String(input);

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/`/g, "&#x60;")
    .replace(/=/g, "&#x3D;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validates and sanitizes a URL for safe use in href attributes.
 * Prevents javascript: protocol and other malicious URL schemes.
 *
 * @param url - The URL to validate
 * @param allowedDomains - Optional list of allowed domains
 * @returns The sanitized URL or a safe fallback
 */
export function sanitizeUrl(
  url: string | undefined | null,
  allowedDomains?: string[],
): string {
  if (!url) {
    return "#";
  }

  const trimmedUrl = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "about:",
  ];

  const lowerUrl = trimmedUrl.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      console.warn("Blocked dangerous URL protocol:", { url: trimmedUrl });
      return "#";
    }
  }

  // Ensure URL starts with http:// or https://
  if (!lowerUrl.startsWith("http://") && !lowerUrl.startsWith("https://")) {
    // If it's a relative URL starting with /, allow it
    if (trimmedUrl.startsWith("/")) {
      return escapeHtmlAttribute(trimmedUrl);
    }
    // Otherwise, prefix with https://
    return escapeHtmlAttribute(`https://${trimmedUrl}`);
  }

  // Validate against allowed domains if provided
  if (allowedDomains && allowedDomains.length > 0) {
    try {
      const urlObj = new URL(trimmedUrl);
      const hostname = urlObj.hostname.toLowerCase();

      const isAllowed = allowedDomains.some((domain) => {
        const normalizedDomain = domain.toLowerCase();
        return (
          hostname === normalizedDomain ||
          hostname.endsWith(`.${normalizedDomain}`)
        );
      });

      if (!isAllowed) {
        console.warn("URL domain not in allowed list:", {
          url: trimmedUrl,
          hostname,
          allowedDomains,
        });
        return "#";
      }
    } catch (e) {
      console.warn("Invalid URL format:", { url: trimmedUrl });
      return "#";
    }
  }

  return escapeHtmlAttribute(trimmedUrl);
}

/**
 * Allowed domains for CDK Insights URLs in emails.
 */
export const CDK_INSIGHTS_ALLOWED_DOMAINS = [
  "cdkinsights.dev",
  "www.cdkinsights.dev",
  "dev.cdkinsights.dev",
  "localhost",
];

/**
 * Derives the email preferences page URL from any CDK Insights URL.
 * Extracts the origin and appends /account.
 *
 * @param siteUrl - Any CDK Insights URL (dashboard, upgrade, etc.)
 * @returns The preferences/account URL for the same environment
 */
export function getPreferencesUrl(siteUrl: string): string {
  try {
    const url = new URL(siteUrl);
    return `${url.origin}/account`;
  } catch {
    return "https://cdkinsights.dev/account";
  }
}
