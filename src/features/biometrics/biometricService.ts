import { BiometricMeta, BiometricStatus, AuthorizeResult } from './types';
import {
  isSupported,
  isPlatformAuthenticatorAvailable,
  createCredential,
  assertCredential,
} from './webauthn';
import { storeSecret, readSecret, deleteSecret } from './vault';
import { verifyTransferPin } from '../../services/banking';

const META_PREFIX = 'emprise:bio:meta:';

function getMetaKey(uid: string): string {
  return `${META_PREFIX}${uid}`;
}

function dispatchBiometricsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('emprise:biometrics-changed'));
  }
}

export const biometricService = {
  async getStatus(uid: string): Promise<BiometricStatus> {
    if (!isSupported()) return 'unsupported';
    const meta = this.getMeta(uid);
    if (meta && meta.credentialId) {
      return 'enrolled';
    }
    const available = await isPlatformAuthenticatorAvailable();
    return available ? 'available' : 'unsupported';
  },

  getMeta(uid: string): BiometricMeta | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(getMetaKey(uid));
      if (!raw) return null;
      return JSON.parse(raw) as BiometricMeta;
    } catch {
      return null;
    }
  },

  async enroll({
    uid,
    name,
    username,
    pinHash,
  }: {
    uid: string;
    name: string;
    username: string;
    pinHash: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Verify pinHash with banking service first
      await verifyTransferPin({ method: 'biometric', pinHash }, uid);

      // 2. Create the WebAuthn credential on platform authenticator
      const credRes = await createCredential({ uid, name, username });
      if (!credRes.success) {
        return { success: false, error: credRes.error || 'Biometric enrollment failed.' };
      }

      // 3. Store secret in hardware-protected cryptographic vault
      const stored = await storeSecret(uid, pinHash);
      if (!stored) {
        return { success: false, error: 'Failed to securely store biometric cryptographic key.' };
      }

      // 4. Save public non-secret metadata
      const meta: BiometricMeta = {
        credentialId: credRes.credentialId,
        deviceLabel: credRes.deviceLabel,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(getMetaKey(uid), JSON.stringify(meta));

      // 5. Notify listeners
      dispatchBiometricsChanged();

      return { success: true };
    } catch (err: any) {
      const msg = err?.code === 'WRONG_PIN' || err?.code === 'BIOMETRIC_STALE'
        ? 'Invalid PIN.'
        : err?.message || 'Biometric setup failed.';
      return { success: false, error: msg };
    }
  },

  async authorize(uid: string, signal?: AbortSignal): Promise<AuthorizeResult> {
    if (!isSupported()) {
      return { success: false, reason: 'unsupported' };
    }

    const meta = this.getMeta(uid);
    if (!meta || !meta.credentialId) {
      return { success: false, reason: 'not_enrolled' };
    }

    // Run platform assertion with user verification
    const assertRes = await assertCredential(meta.credentialId, signal);
    if (!assertRes.success) {
      return { success: false, reason: assertRes.reason };
    }

    // Only on successful physical biometric assertion, read secret from vault
    const pinHash = await readSecret(uid);
    if (!pinHash) {
      return { success: false, reason: 'vault_error' };
    }

    // Update metadata lastUsedAt
    try {
      const updatedMeta: BiometricMeta = {
        ...meta,
        lastUsedAt: new Date().toISOString(),
      };
      localStorage.setItem(getMetaKey(uid), JSON.stringify(updatedMeta));
      dispatchBiometricsChanged();
    } catch {
      // Non-fatal
    }

    return { success: true, pinHash };
  },

  async disable(uid: string): Promise<void> {
    try {
      await deleteSecret(uid);
      localStorage.removeItem(getMetaKey(uid));
      dispatchBiometricsChanged();
    } catch (err) {
      console.error('[biometrics] disable error:', err);
    }
  },
};
