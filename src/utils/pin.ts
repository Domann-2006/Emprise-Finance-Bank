/**
 * Secure 4-Digit Transfer PIN Utilities for Emprise Finance
 * Uses Web Crypto PBKDF2 with SHA-256, 150,000 iterations, and salted with member UID.
 * 
 * SECURITY MANDATE:
 * Raw PINs and computed hashes must NEVER be logged, stored in drafts, localStorage,
 * sessionStorage, or exposed in URLs.
 */

/**
 * Computes a cryptographically salted PBKDF2 SHA-256 hash of a 4-digit PIN.
 * Output: 64-character lowercase hex string (256 bits).
 */
export async function hashPin(pin: string, uid: string): Promise<string> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  const salt = encoder.encode('emprise-pin:' + uid);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 150000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  const byteArray = new Uint8Array(derivedBits);
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Evaluates whether a 4-digit PIN is overly simple / easily guessable.
 * Rejects all-same digits (0000, 1111...) and straight sequential runs (1234, 4321, 0123, 3210...).
 */
export function isWeakPin(pin: string): boolean {
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return true;
  }

  // All identical digits (e.g. 0000, 1111, 2222...)
  if (pin[0] === pin[1] && pin[1] === pin[2] && pin[2] === pin[3]) {
    return true;
  }

  const d = pin.split('').map(Number);

  // Ascending sequential run (e.g. 0123, 1234, 2345, 6789...)
  const isAscending = d[1] === d[0] + 1 && d[2] === d[1] + 1 && d[3] === d[2] + 1;

  // Descending sequential run (e.g. 3210, 4321, 5432, 9876...)
  const isDescending = d[1] === d[0] - 1 && d[2] === d[1] - 1 && d[3] === d[2] - 1;

  return isAscending || isDescending;
}
