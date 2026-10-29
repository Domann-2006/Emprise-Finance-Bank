import { useState, useEffect, useCallback } from 'react';
import { BiometricStatus, BiometricMeta } from './types';
import { biometricService } from './biometricService';

export function useBiometrics(uid?: string) {
  const [status, setStatus] = useState<BiometricStatus>('unsupported');
  const [meta, setMeta] = useState<BiometricMeta | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) {
      setStatus('unsupported');
      setMeta(null);
      return;
    }
    const currentMeta = biometricService.getMeta(uid);
    setMeta(currentMeta);
    const currentStatus = await biometricService.getStatus(uid);
    setStatus(currentStatus);
  }, [uid]);

  useEffect(() => {
    refresh();

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener('emprise:biometrics-changed', handleUpdate);
    return () => {
      window.removeEventListener('emprise:biometrics-changed', handleUpdate);
    };
  }, [refresh]);

  return {
    status,
    meta,
    isEnrolled: status === 'enrolled',
    refresh,
  };
}
