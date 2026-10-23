/**
 * Draft Persistence Hook for Emprise Finance
 * Saves in-progress form drafts to localStorage with 300ms debounce and 24-hour TTL.
 * 
 * Storage Key Format: `emprise:draft:<uid|guest>:<key>`
 * Automatically purges expired drafts upon reading.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface StoredDraft<T> {
  value: T;
  timestamp: number;
}

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useDraftState<T>(
  uid: string | null | undefined,
  draftKey: string,
  initialValue: T
): [T, (val: T | ((prev: T) => T)) => void, () => void] {
  const effectiveUid = uid || 'guest';
  const fullKey = `emprise:draft:${effectiveUid}:${draftKey}`;

  // Safe read with 24-hour expiration check
  const readInitial = (): T => {
    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return initialValue;
      const parsed: StoredDraft<T> = JSON.parse(raw);
      if (typeof parsed?.timestamp !== 'number' || Date.now() - parsed.timestamp > DRAFT_TTL_MS) {
        localStorage.removeItem(fullKey);
        return initialValue;
      }
      return parsed.value;
    } catch {
      return initialValue;
    }
  };

  const [state, setState] = useState<T>(readInitial);
  const debounceTimerRef = useRef<any>(null);
  const isFirstRender = useRef(true);

  // Debounce saving changes to localStorage
  useEffect(() => {
    // Avoid re-saving on immediate mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        const payload: StoredDraft<T> = {
          value: state,
          timestamp: Date.now(),
        };
        localStorage.setItem(fullKey, JSON.stringify(payload));
      } catch (err) {
        console.warn('Unable to persist draft to localStorage:', err);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state, fullKey]);

  // Clears draft from localStorage and resets state
  const clearDraft = useCallback(() => {
    try {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      localStorage.removeItem(fullKey);
      setState(initialValue);
    } catch (err) {
      console.warn('Unable to clear draft:', err);
    }
  }, [fullKey, initialValue]);

  return [state, setState, clearDraft];
}
