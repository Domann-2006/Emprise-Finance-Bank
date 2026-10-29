/**
 * WebAuthn Thin Wrappers for Platform Biometric Authentication
 */

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
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
  return buffer;
}

export function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Platform Authenticator';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'Face ID / Touch ID';
  if (/Mac/.test(ua)) return 'Touch ID';
  if (/Windows/.test(ua)) return 'Windows Hello';
  if (/Android/.test(ua)) return 'Android Biometrics';
  return 'Platform Authenticator';
}

export function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof navigator !== 'undefined' &&
    navigator.credentials !== undefined
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

export async function createCredential(
  user: { uid: string; name: string; username: string },
  signal?: AbortSignal
): Promise<
  | { success: true; credentialId: string; deviceLabel: string }
  | { success: false; reason: 'cancelled' | 'failed'; error?: string }
> {
  if (!isSupported()) {
    return { success: false, reason: 'failed', error: 'WebAuthn is not supported on this device.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(user.uid);
    const host = window.location.hostname;

    const creationOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'Emprise Finance',
          id: host,
        },
        user: {
          id: userIdBytes,
          name: user.username,
          displayName: user.name,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60000,
        attestation: 'none',
      },
      signal,
    };

    const credential = (await navigator.credentials.create(creationOptions)) as PublicKeyCredential | null;
    if (!credential) {
      return { success: false, reason: 'cancelled', error: 'Biometric enrollment cancelled.' };
    }

    const credentialId = bufferToBase64Url(credential.rawId);
    const deviceLabel = detectDeviceLabel();

    return {
      success: true,
      credentialId,
      deviceLabel,
    };
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError' || err?.name === 'NotAllowedError') {
      return { success: false, reason: 'cancelled', error: 'Biometric prompt was cancelled.' };
    }
    return { success: false, reason: 'failed', error: err?.message || 'Biometric registration failed.' };
  }
}

export async function assertCredential(
  credentialId: string,
  signal?: AbortSignal
): Promise<{ success: true } | { success: false; reason: 'cancelled' | 'failed'; error?: string }> {
  if (!isSupported()) {
    return { success: false, reason: 'failed', error: 'WebAuthn is not supported on this device.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const host = window.location.hostname;
    const credentialBuffer = base64UrlToBuffer(credentialId);

    const getOptions: CredentialRequestOptions = {
      publicKey: {
        challenge,
        rpId: host,
        allowCredentials: [
          {
            id: credentialBuffer,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
      signal,
    };

    const assertion = (await navigator.credentials.get(getOptions)) as PublicKeyCredential | null;
    if (!assertion) {
      return { success: false, reason: 'cancelled', error: 'Biometric verification cancelled.' };
    }

    return { success: true };
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError' || err?.name === 'NotAllowedError') {
      return { success: false, reason: 'cancelled', error: 'Biometric prompt was cancelled.' };
    }
    return { success: false, reason: 'failed', error: err?.message || 'Biometric verification failed.' };
  }
}
