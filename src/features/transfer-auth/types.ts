export type TransferAuthorization =
  | { method: 'pin'; pin: string }
  | { method: 'biometric'; pinHash: string };
