/**
 * Formatting and conversion helpers for financial numbers, dates, and accounts
 */

/**
 * Formats integer cents to USD string (e.g. 1485075 -> "$14,850.75")
 */
export function formatCentsToUSD(cents: number, includeSign = false): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = (absCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (includeSign) {
    if (isNegative) return `-$${dollars}`;
    return `+$${dollars}`;
  }

  return isNegative ? `-$${dollars}` : `$${dollars}`;
}

/**
 * Converts a string or dollar number into integer cents (e.g. "14,850.75" -> 1485075)
 */
export function parseUSDToCents(amount: string | number): number {
  if (typeof amount === 'number') {
    return Math.round(amount * 100);
  }
  const clean = amount.replace(/[$, ]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Masks a 10-digit account number to show last 4 digits (e.g. "1040842109" -> "•••• 2109")
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '•••• ----';
  const clean = accountNumber.trim();
  const last4 = clean.slice(-4);
  return `•••• ${last4}`;
}

/**
 * Generates a random unique 10-digit account number
 */
export function generateAccountNumber(): string {
  // Generate a realistic 10-digit account number starting with 48 (e.g. 4829104821)
  const prefix = "48";
  const rest = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `${prefix}${rest}`;
}

/**
 * Formats timestamps to human readable dates
 */
export function formatDateTime(dateInput: any): string {
  if (!dateInput) return 'Recent';
  let date: Date;

  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (dateInput && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else {
    return 'Recent';
  }

  if (isNaN(date.getTime())) return 'Recent';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formats a date string (YYYY-MM-DD or MM/DD/YYYY) to formatted display
 */
export function formatDateOnly(dateInput: any): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a phone number as (XXX) XXX-XXXX
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}
