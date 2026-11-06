/**
 * Brand Configuration for Emprise Finance
 * Centralized brand tokens, contact info, and internal auth domain.
 */

export const APP_NAME = "Emprise Finance";
export const BANK_NAME = APP_NAME;
export const SUPPORT_PHONE = "210-577-1722";
export const SUPPORT_PHONE_DISPLAY = "210-577-1722";
export const SUPPORT_EMAIL = "emprisesuppor@exdonuts.com";
export const SUPPORT_HOURS = "24 hours a day, 7 days a week, 365 days a year";
export const ROUTING_NUMBER = "381041270";
export const WIRE_ROUTING_NUMBER = "381041270";
export const ACH_PER_TRANSFER_LIMIT_CENTS = 2500000; // $25,000
export const ACH_PROCESSING_TEXT = "within 3 working days";
export const ACH_MAX_SETTLE_MS = 3 * 24 * 60 * 60 * 1000; // 72 working hours (3 working days)

/**
 * Adds business milliseconds to a starting timestamp, skipping Saturdays and Sundays.
 * If the resulting timestamp lands on a weekend, it is pushed forward to Monday.
 */
export function addBusinessMs(from: number, msToAdd: number): number {
  let curr = new Date(from);

  // If starting on a weekend, push forward to Monday
  if (curr.getDay() === 6) {
    curr = new Date(curr.getTime() + 2 * 24 * 60 * 60 * 1000);
  } else if (curr.getDay() === 0) {
    curr = new Date(curr.getTime() + 1 * 24 * 60 * 60 * 1000);
  }

  let remainingMs = Math.max(0, msToAdd);

  while (remainingMs > 0) {
    const msIntoDay =
      (curr.getHours() * 3600 + curr.getMinutes() * 60 + curr.getSeconds()) * 1000 +
      curr.getMilliseconds();
    const msUntilMidnight = 24 * 60 * 60 * 1000 - msIntoDay;

    if (remainingMs <= msUntilMidnight) {
      curr = new Date(curr.getTime() + remainingMs);
      remainingMs = 0;
    } else {
      curr = new Date(curr.getTime() + msUntilMidnight);
      remainingMs -= msUntilMidnight;
    }

    // Skip Saturday and Sunday
    if (curr.getDay() === 6) {
      curr = new Date(curr.getTime() + 2 * 24 * 60 * 60 * 1000);
    } else if (curr.getDay() === 0) {
      curr = new Date(curr.getTime() + 1 * 24 * 60 * 60 * 1000);
    }
  }

  if (curr.getDay() === 6) {
    curr = new Date(curr.getTime() + 2 * 24 * 60 * 60 * 1000);
  } else if (curr.getDay() === 0) {
    curr = new Date(curr.getTime() + 1 * 24 * 60 * 60 * 1000);
  }

  return curr.getTime();
}

/**
 * Returns a settlement timestamp between 0 and 3 working days (72 business hours) from `from`,
 * skipping Saturdays and Sundays entirely.
 */
export function randomSettleAtMs(from: number = Date.now()): number {
  const randomMs = Math.floor(Math.random() * (ACH_MAX_SETTLE_MS + 1));
  return addBusinessMs(from, randomMs);
}

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
