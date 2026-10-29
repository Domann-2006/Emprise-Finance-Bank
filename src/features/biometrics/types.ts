export interface BiometricMeta {
  credentialId: string;
  deviceLabel: string;
  createdAt: string;
  lastUsedAt?: string;
}

export type BiometricStatus = 'unsupported' | 'available' | 'enrolled';

export type AuthorizeResult =
  | { success: true; pinHash: string }
  | { success: false; reason: 'cancelled' | 'unsupported' | 'not_enrolled' | 'vault_error' | 'failed' };
