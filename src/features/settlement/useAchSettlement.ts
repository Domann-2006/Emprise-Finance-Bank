import { useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  DocumentReference,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, isMockEnabled } from '../../services/firebase';
import { mockStorage } from '../../services/mockStorage';
import { TransactionRecord } from '../../types';
import { randomSettleAtMs } from '../../config/brand';

function extractMillis(val: any): number | null {
  if (!val) return null;
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function computeSettleMs(tx: TransactionRecord): number {
  const settleAtMs = extractMillis(tx.settleAt);
  if (settleAtMs !== null) return settleAtMs;

  const createdAtMs = extractMillis(tx.createdAt);
  if (createdAtMs !== null) return randomSettleAtMs(createdAtMs);

  return Date.now();
}

/**
 * useAchSettlement Hook
 * Automatically settles pending ACH (other-bank) transfers to 'cleared'
 * once their scheduled settleAt time is reached.
 */
export function useAchSettlement(
  uid?: string,
  onSettled?: (tx: TransactionRecord) => void
) {
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const retriesRef = useRef<Map<string, number>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Clear all existing timers and state on uid change
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    retriesRef.current.clear();
    inFlightRef.current.clear();

    if (!uid) return;

    // Firebase live mode
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, 'transactions'),
        where('ownerUid', '==', uid),
        where('status', '==', 'pending')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const currentPendingIds = new Set<string>();

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as TransactionRecord;
            const docId = docSnap.id;

            if (data.transferType !== 'ach') return;
            currentPendingIds.add(docId);

            // If an execution is in-flight, do not schedule another
            if (inFlightRef.current.has(docId)) return;

            // If already scheduled, let it run
            if (timersRef.current.has(docId)) return;

            const settleMs = computeSettleMs(data);
            const delay = Math.max(0, settleMs - Date.now() + 600);

            const scheduleExecution = (ref: DocumentReference, id: string, txData: TransactionRecord) => {
              const timer = setTimeout(async () => {
                timersRef.current.delete(id);

                if (inFlightRef.current.has(id)) return;
                inFlightRef.current.add(id);

                try {
                  // Write exactly status: 'cleared' and settledAt: serverTimestamp()
                  await updateDoc(ref, {
                    status: 'cleared',
                    settledAt: serverTimestamp(),
                  });

                  inFlightRef.current.delete(id);
                  retriesRef.current.delete(id);

                  onSettledRef.current?.({
                    ...txData,
                    id,
                    status: 'cleared',
                    settledAt: new Date(),
                  });
                } catch (err: any) {
                  inFlightRef.current.delete(id);

                  const isPermissionDenied =
                    err?.code === 'permission-denied' ||
                    (err?.message && String(err.message).toLowerCase().includes('permission'));

                  if (isPermissionDenied) {
                    const attempts = retriesRef.current.get(id) || 0;
                    if (attempts < 5) {
                      retriesRef.current.set(id, attempts + 1);
                      const retryTimer = setTimeout(() => {
                        scheduleExecution(ref, id, txData);
                      }, 3000);
                      timersRef.current.set(id, retryTimer);
                    } else {
                      retriesRef.current.delete(id);
                    }
                  }
                }
              }, delay);

              timersRef.current.set(id, timer);
            };

            scheduleExecution(docSnap.ref, docId, data);
          });

          // Cancel timers for records that are no longer pending
          timersRef.current.forEach((timer, id) => {
            if (!currentPendingIds.has(id)) {
              clearTimeout(timer);
              timersRef.current.delete(id);
              retriesRef.current.delete(id);
            }
          });
        },
        (error) => {
          console.warn('ACH settlement listener error:', error);
        }
      );

      return () => {
        unsubscribe();
        timersRef.current.forEach((timer) => clearTimeout(timer));
        timersRef.current.clear();
        retriesRef.current.clear();
        inFlightRef.current.clear();
      };
    }

    // Mock storage mode
    if (isMockEnabled) {
      const syncMockPending = () => {
        const allTx = mockStorage.getAllTransactions();
        const pendingAch = allTx.filter(
          (tx) => tx.ownerUid === uid && tx.status === 'pending' && tx.transferType === 'ach'
        );

        const currentIds = new Set<string>();

        pendingAch.forEach((tx) => {
          currentIds.add(tx.id);
          if (inFlightRef.current.has(tx.id)) return;
          if (timersRef.current.has(tx.id)) return;

          const settleMs = computeSettleMs(tx);
          const delay = Math.max(0, settleMs - Date.now() + 600);

          const timer = setTimeout(() => {
            timersRef.current.delete(tx.id);
            inFlightRef.current.add(tx.id);

            const cleared = mockStorage.clearPendingAch(tx.id);
            inFlightRef.current.delete(tx.id);

            if (cleared) {
              onSettledRef.current?.(cleared);
            }
          }, delay);

          timersRef.current.set(tx.id, timer);
        });

        // Cancel timers for removed or settled records
        timersRef.current.forEach((timer, id) => {
          if (!currentIds.has(id)) {
            clearTimeout(timer);
            timersRef.current.delete(id);
          }
        });
      };

      syncMockPending();
      window.addEventListener('emprise_storage_updated', syncMockPending);

      return () => {
        window.removeEventListener('emprise_storage_updated', syncMockPending);
        timersRef.current.forEach((timer) => clearTimeout(timer));
        timersRef.current.clear();
        retriesRef.current.clear();
        inFlightRef.current.clear();
      };
    }
  }, [uid]);
}
