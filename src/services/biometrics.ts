/**
 * Web Authentication API (WebAuthn) Biometric Authentication Service
 *
 * Implements hardware-backed biometric verification (Touch ID, Face ID, Windows Hello,
 * Android Fingerprint/Biometrics) for high-value transactions.
 */

export interface BiometricConfig {
  enabled: boolean;
  credentialId?: string;
  credentialName?: string;
  createdAt?: string;
  thresholdCents: number; // Default 100,000 ($1,000.00)
  lastVerifiedAt?: number;
}

export const DEFAULT_BIOMETRIC_THRESHOLD_CENTS = 100000; // $1,000.00

export const THRESHOLD_OPTIONS = [
  { label: '$500.00', value: 50000 },
  { label: '$1,000.00 (Standard Banking Default)', value: 100000 },
  { label: '$2,500.00', value: 250000 },
  { label: '$5,000.00', value: 500000 },
  { label: 'All Transfers (Require for every transfer)', value: 0 },
];

/**
 * Converts ArrayBuffer to base64url string
 */
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts base64url string to Uint8Array backed by an ArrayBuffer
 */
function base64UrlToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Checks if browser supports Web Authentication API
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof navigator !== 'undefined' &&
    navigator.credentials !== undefined
  );
}

/**
 * Checks if a user-verifying platform authenticator (Touch ID, Face ID, Windows Hello)
 * is available on this physical device.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Retrieves biometric configuration for a user from storage
 */
export function getBiometricConfig(uid: string): BiometricConfig {
  if (typeof window === 'undefined') {
    return { enabled: false, thresholdCents: DEFAULT_BIOMETRIC_THRESHOLD_CENTS };
  }
  try {
    const raw = localStorage.getItem(`emprise:biometrics:${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed.enabled ?? false,
        credentialId: parsed.credentialId,
        credentialName: parsed.credentialName,
        createdAt: parsed.createdAt,
        thresholdCents: typeof parsed.thresholdCents === 'number' ? parsed.thresholdCents : DEFAULT_BIOMETRIC_THRESHOLD_CENTS,
        lastVerifiedAt: parsed.lastVerifiedAt,
      };
    }
  } catch (e) {
    console.warn('Unable to read biometric config:', e);
  }
  return { enabled: false, thresholdCents: DEFAULT_BIOMETRIC_THRESHOLD_CENTS };
}

/**
 * Saves biometric configuration for a user
 */
export function saveBiometricConfig(uid: string, updates: Partial<BiometricConfig>): BiometricConfig {
  const current = getBiometricConfig(uid);
  const updated: BiometricConfig = { ...current, ...updates };
  try {
    localStorage.setItem(`emprise:biometrics:${uid}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('emprise_biometrics_updated', { detail: { uid, config: updated } }));
  } catch (e) {
    console.warn('Unable to save biometric config:', e);
  }
  return updated;
}

/**
 * Determines if a given transfer amount meets the high-value biometric threshold
 */
export function isHighValueTransfer(amountCents: number, thresholdCents?: number): boolean {
  const threshold = typeof thresholdCents === 'number' ? thresholdCents : DEFAULT_BIOMETRIC_THRESHOLD_CENTS;
  return amountCents >= threshold;
}

/**
 * Enrolls device biometrics using the Web Authentication API (navigator.credentials.create)
 */
export async function registerBiometricCredential(user: {
  uid: string;
  name: string;
  username: string;
}): Promise<{ success: boolean; credentialName: string; error?: string }> {
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      credentialName: '',
      error: 'Web Authentication API is not supported in this browser.',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(user.uid);

    const host = window.location.hostname;
    // rpId must match effective domain without port
    const rpId = host === 'localhost' || host === '127.0.0.1' ? host : host;

    const creationOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'Emprise Finance Secure Banking',
          id: rpId,
        },
        user: {
          id: userIdBytes,
          name: user.username,
          displayName: user.name,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    };

    const credential = (await navigator.credentials.create(creationOptions)) as PublicKeyCredential | null;

    if (!credential) {
      return {
        success: false,
        credentialName: '',
        error: 'Biometric enrollment was cancelled.',
      };
    }

    const credentialIdStr = bufferToBase64Url(credential.rawId);
    const platformName = detectPlatformName();
    const credentialName = `${platformName} (${new Date().toLocaleDateString()})`;

    saveBiometricConfig(user.uid, {
      enabled: true,
      credentialId: credentialIdStr,
      credentialName,
      createdAt: new Date().toISOString(),
      lastVerifiedAt: Date.now(),
    });

    return {
      success: true,
      credentialName,
    };
  } catch (err: any) {
    console.error('Biometric enrollment error:', err);
    let errorMsg = 'Failed to enroll biometric device.';
    if (err.name === 'NotAllowedError') {
      errorMsg = 'Biometric setup was cancelled or timed out. Please try again.';
    } else if (err.name === 'InvalidStateError') {
      errorMsg = 'This biometric credential is already enrolled on this device.';
    } else if (err.message) {
      errorMsg = err.message;
    }
    return {
      success: false,
      credentialName: '',
      error: errorMsg,
    };
  }
}

/**
 * Prompts user for biometric verification using Web Authentication API (navigator.credentials.get)
 */
export async function verifyBiometrics(params: {
  uid: string;
  amountCents?: number;
  recipientName?: string;
}): Promise<{ success: boolean; verifiedAt?: number; error?: string }> {
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      error: 'Web Authentication API is not supported on this device.',
    };
  }

  const config = getBiometricConfig(params.uid);

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const host = window.location.hostname;
    const rpId = host === 'localhost' || host === '127.0.0.1' ? host : host;

    const allowCredentials: PublicKeyCredentialDescriptor[] = [];
    if (config.credentialId) {
      try {
        allowCredentials.push({
          id: base64UrlToUint8Array(config.credentialId) as unknown as BufferSource,
          type: 'public-key',
          transports: ['internal'],
        });
      } catch (e) {
        console.warn('Could not parse stored credentialId, attempting resident key lookup:', e);
      }
    }

    const getOptions: CredentialRequestOptions = {
      publicKey: {
        challenge,
        rpId,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: 'required',
        timeout: 60000,
      },
    };

    const assertion = (await navigator.credentials.get(getOptions)) as PublicKeyCredential | null;

    if (!assertion) {
      return {
        success: false,
        error: 'Biometric authorization was cancelled.',
      };
    }

    const now = Date.now();
    saveBiometricConfig(params.uid, {
      lastVerifiedAt: now,
    });

    return {
      success: true,
      verifiedAt: now,
    };
  } catch (err: any) {
    console.error('Biometric verification error:', err);
    let errorMsg = 'Biometric verification failed.';
    if (err.name === 'NotAllowedError') {
      errorMsg = 'Biometric scan was cancelled or timed out.';
    } else if (err.name === 'SecurityError') {
      errorMsg = 'Security policy prevented biometric authentication.';
    } else if (err.message) {
      errorMsg = err.message;
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Removes biometric credential for a user
 */
export function removeBiometricCredential(uid: string): void {
  saveBiometricConfig(uid, {
    enabled: false,
    credentialId: undefined,
    credentialName: undefined,
    createdAt: undefined,
  });
}

/**
 * Detects user platform for user-friendly labels
 */
function detectPlatformName(): string {
  if (typeof navigator === 'undefined') return 'Device Biometrics';
  const ua = navigator.userAgent || '';
  if (/Mac|iPhone|iPad|iPod/.test(ua)) {
    return /iPhone|iPad|iPod/.test(ua) ? 'Face ID / Touch ID' : 'Touch ID';
  }
  if (/Windows/.test(ua)) {
    return 'Windows Hello';
  }
  if (/Android/.test(ua)) {
    return 'Android Biometric Sensor';
  }
  return 'Platform Biometrics';
}
