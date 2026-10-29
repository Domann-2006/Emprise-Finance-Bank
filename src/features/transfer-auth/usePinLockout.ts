import { useState, useEffect, useCallback } from 'react';

interface StoredLockout {
  count: number;
  lockedUntil: number;
}

export function usePinLockout(uid?: string) {
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);

  const getStorageKey = useCallback(() => (uid ? `emprise:pinfail:${uid}` : null), [uid]);

  const checkState = useCallback(() => {
    const key = getStorageKey();
    if (!key || typeof window === 'undefined') {
      setRemainingSec(0);
      setAttemptsLeft(3);
      return;
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setRemainingSec(0);
        setAttemptsLeft(3);
        return;
      }
      const data: StoredLockout = JSON.parse(raw);
      const now = Date.now();

      if (data.lockedUntil && data.lockedUntil > now) {
        const diff = Math.ceil((data.lockedUntil - now) / 1000);
        setRemainingSec(diff);
        setAttemptsLeft(0);
      } else {
        // Lockout expired or never locked
        if (data.lockedUntil && data.lockedUntil <= now) {
          // Reset expired lockout
          localStorage.removeItem(key);
          setRemainingSec(0);
          setAttemptsLeft(3);
        } else {
          setRemainingSec(0);
          setAttemptsLeft(Math.max(0, 3 - (data.count || 0)));
        }
      }
    } catch {
      setRemainingSec(0);
      setAttemptsLeft(3);
    }
  }, [getStorageKey]);

  useEffect(() => {
    checkState();
  }, [checkState]);

  // 1-second interval ticker when locked
  useEffect(() => {
    if (remainingSec <= 0) return;

    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          const key = getStorageKey();
          if (key) {
            try {
              localStorage.removeItem(key);
            } catch {}
          }
          setAttemptsLeft(3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSec, getStorageKey]);

  const registerFailure = useCallback(() => {
    const key = getStorageKey();
    if (!key) return { isLocked: false, attemptsLeft: 2 };

    try {
      const raw = localStorage.getItem(key);
      const data: StoredLockout = raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
      const newCount = (data.count || 0) + 1;

      if (newCount >= 3) {
        const lockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
        localStorage.setItem(key, JSON.stringify({ count: newCount, lockedUntil }));
        setRemainingSec(15 * 60);
        setAttemptsLeft(0);
        return { isLocked: true, attemptsLeft: 0 };
      } else {
        localStorage.setItem(key, JSON.stringify({ count: newCount, lockedUntil: 0 }));
        const left = Math.max(0, 3 - newCount);
        setAttemptsLeft(left);
        setRemainingSec(0);
        return { isLocked: false, attemptsLeft: left };
      }
    } catch {
      return { isLocked: false, attemptsLeft: 2 };
    }
  }, [getStorageKey]);

  const reset = useCallback(() => {
    const key = getStorageKey();
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {}
    setRemainingSec(0);
    setAttemptsLeft(3);
  }, [getStorageKey]);

  return {
    remainingSec,
    attemptsLeft,
    registerFailure,
    reset,
    isLocked: remainingSec > 0,
  };
}
