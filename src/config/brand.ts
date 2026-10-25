/**
 * Brand Configuration for Emprise Finance
 * Centralized brand tokens, contact info, and internal auth domain.
 */

export const APP_NAME = "Emprise Finance";
export const SUPPORT_PHONE = "210-577-1722";
export const SUPPORT_PHONE_DISPLAY = "210-577-1722";
export const SUPPORT_EMAIL = "support@example.com";
export const SUPPORT_HOURS = "24 hours a day, 7 days a week, 365 days a year";
export const ROUTING_NUMBER = "000000000";
export const WIRE_ROUTING_NUMBER = "000000000";
export const SWIFT_CODE = "XXXXXXXX";
export const AUTH_EMAIL_DOMAIN = "emprise.internal";
export const CURRENT_YEAR = new Date().getFullYear();

/**
 * Derives a valid Firebase email from a username
 */
export function deriveAuthEmail(username: string): string {
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${cleanUsername}@${AUTH_EMAIL_DOMAIN}`;
}

/**
 * Extracts a username from derived email if matching domain
 */
export function extractUsername(email?: string | null): string {
  if (!email) return '';
  if (email.endsWith(`@${AUTH_EMAIL_DOMAIN}`)) {
    return email.replace(`@${AUTH_EMAIL_DOMAIN}`, '');
  }
  return email.split('@')[0];
}
