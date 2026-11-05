import { ROUTING_NUMBER } from '../config/brand';

/**
 * Validates a US ABA Routing Transit Number using the standard 9-digit weighted checksum algorithm:
 * (3*(d1 + d4 + d7) + 7*(d2 + d5 + d8) + (d3 + d6 + d9)) % 10 === 0
 * Enforces exactly 9 numeric digits.
 */
export function isValidRoutingNumber(rtn: string): boolean {
  const clean = (rtn || '').trim().replace(/\D/g, '');
  if (clean.length !== 9) return false;

  const d = clean.split('').map((c) => parseInt(c, 10));
  if (d.some(isNaN)) return false;

  const checksum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    1 * (d[2] + d[5] + d[8]);

  return checksum % 10 === 0;
}

/**
 * Checks if a given routing number belongs to Emprise Finance.
 */
export function isOwnRoutingNumber(rtn: string): boolean {
  const clean = (rtn || '').trim().replace(/\D/g, '');
  return clean === ROUTING_NUMBER;
}

/**
 * Normalizes and formats a 9-digit routing number string.
 */
export function formatRouting(rtn: string): string {
  return (rtn || '').replace(/\D/g, '').slice(0, 9);
}
