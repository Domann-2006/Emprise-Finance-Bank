import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, ShieldAlert, AlertCircle } from 'lucide-react';
import { UserProfile, BankAccount } from '../../types';
import { formatCentsToUSD, maskAccountNumber } from '../../utils/format';
import { UserAvatar } from '../common/UserAvatar';
import { getUserMessage } from '../../utils/errorMessages';
import { permanentlyDeleteCustomer } from '../../services/banking';

export interface PermanentDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'single' | 'bulk';
  targetUser?: UserProfile | null;
  targetAccount?: BankAccount | null;
  bulkUsers?: UserProfile[];
  accounts?: BankAccount[];
  onDeletedSingle?: (uid: string, deletedTransactions: number) => void;
  onDeletedBulk?: (deletedUids: string[], totalDeletedTx: number) => void;
}

export const PermanentDeleteDialog: React.FC<PermanentDeleteDialogProps> = ({
  isOpen,
  onClose,
  mode,
  targetUser,
  targetAccount,
  bulkUsers = [],
  accounts = [],
  onDeletedSingle,
  onDeletedBulk,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setErrorMessage(null);
      setIsDeleting(false);
      setProgress(null);
    }
  }, [isOpen, targetUser, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isSingle = mode === 'single';

  // Check confirmation input
  const isSingleMatch = isSingle && targetUser
    ? confirmInput.trim().replace(/^@/, '').toLowerCase() === targetUser.username.toLowerCase()
    : false;

  const isBulkMatch = !isSingle && confirmInput.trim() === 'DELETE';
  const canConfirm = (isSingle ? isSingleMatch : isBulkMatch) && !isDeleting;

  // Compute total balance for bulk if applicable
  const totalBulkBalanceCents = !isSingle
    ? bulkUsers.reduce((sum, u) => {
        const acct = accounts.find((a) => a.ownerUid === u.uid);
        return sum + (acct?.balanceCents || 0);
      }, 0)
    : 0;

  // Single delete action
  const handleDeleteSingle = async () => {
    if (!targetUser || !isSingleMatch || isDeleting) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await permanentlyDeleteCustomer(targetUser.uid);
      onDeletedSingle?.(targetUser.uid, res.deletedTransactions);
      onClose();
    } catch (err: any) {
      setErrorMessage(getUserMessage(err));
      setIsDeleting(false);
    }
  };

  // Bulk delete action (sequential with progress, stops on first error)
  const handleDeleteBulk = async () => {
    if (bulkUsers.length === 0 || !isBulkMatch || isDeleting) return;
    setIsDeleting(true);
    setErrorMessage(null);
    const successfullyDeletedUids: string[] = [];
    let totalTransactionsDeleted = 0;

    for (let i = 0; i < bulkUsers.length; i++) {
      const user = bulkUsers[i];
      setProgress({
        current: i + 1,
        total: bulkUsers.length,
        currentName: user.name,
      });

      try {
        const res = await permanentlyDeleteCustomer(user.uid);
        successfullyDeletedUids.push(user.uid);
        totalTransactionsDeleted += res.deletedTransactions;
      } catch (err: any) {
        const friendlyMsg = getUserMessage(err);
        setErrorMessage(
          `Deletion stopped on ${user.name} (${i + 1} of ${bulkUsers.length}): ${friendlyMsg}. Successfully deleted ${successfullyDeletedUids.length} account(s).`
        );
        setIsDeleting(false);
        if (successfullyDeletedUids.length > 0) {
          onDeletedBulk?.(successfullyDeletedUids, totalTransactionsDeleted);
        }
        return;
      }
    }

    setIsDeleting(false);
    onDeletedBulk?.(successfullyDeletedUids, totalTransactionsDeleted);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 border border-outline-variant/30 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top decorative accent line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-error" />

        {/* Header */}
        <div className="flex items-start justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface">
                {isSingle ? 'Permanently Delete Customer' : `Permanently Delete All Closed (${bulkUsers.length})`}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Irreversible administrative deletion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notice */}
        {errorMessage && (
          <div className="p-3.5 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Single Customer Details */}
        {isSingle && targetUser && (
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <UserAvatar user={targetUser} size="md" className="w-10 h-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-on-surface truncate">{targetUser.name}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 text-[10px] font-bold">
                    Closed
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-mono truncate">
                  @{targetUser.username} • {targetUser.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/15 text-xs">
              <div>
                <span className="text-[11px] text-on-surface-variant block font-medium">Account Number</span>
                <span className="font-mono font-bold text-on-surface">
                  {targetAccount?.accountNumber ? maskAccountNumber(targetAccount.accountNumber) : 'None'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-on-surface-variant block font-medium">Ledger Balance</span>
                <span className={`font-mono font-bold ${targetAccount && targetAccount.balanceCents > 0 ? 'text-error' : 'text-on-surface'}`}>
                  {targetAccount ? formatCentsToUSD(targetAccount.balanceCents) : '$0.00'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Balance Alert (Single mode) */}
        {isSingle && targetAccount && targetAccount.balanceCents > 0 && (
          <div className="p-3.5 bg-error-container/40 border border-error/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-error">Active Balance Warning</p>
              <p className="text-on-surface-variant mt-0.5 leading-snug">
                This account still holds a balance of <strong className="text-on-surface font-mono">{formatCentsToUSD(targetAccount.balanceCents)} USD</strong>. Permanently deleting this customer will irrevocably destroy these ledger records.
              </p>
            </div>
          </div>
        )}

        {/* Bulk Summary Alert */}
        {!isSingle && (
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-on-surface-variant">Closed Accounts to Delete:</span>
              <span className="font-bold font-mono text-on-surface">{bulkUsers.length}</span>
            </div>
            {totalBulkBalanceCents > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-outline-variant/15 text-error">
                <span className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Combined Remaining Balance:
                </span>
                <span className="font-mono font-bold">{formatCentsToUSD(totalBulkBalanceCents)} USD</span>
              </div>
            )}
          </div>
        )}

        {/* Scope of deletion warning */}
        <div className="text-xs text-on-surface-variant/90 leading-relaxed bg-surface-container p-3 rounded-xl flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <p>
            This action <strong className="text-error font-semibold">cannot be undone</strong>. All user records, account details, customer transaction histories, directory entries, and transfer PINs will be permanently removed.
          </p>
        </div>

        {/* Progress display during bulk deletion */}
        {isDeleting && progress && (
          <div className="p-3.5 bg-surface-container-high rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface">
              <span>
                Deleting {progress.current} of {progress.total}...
              </span>
              <span className="font-mono truncate max-w-[180px]">{progress.currentName}</span>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-error transition-all duration-300 rounded-full"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Confirmation prompt and text input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-on-surface block" htmlFor="permDeleteConfirm">
            {isSingle && targetUser ? (
              <span>
                To confirm permanent deletion, type{' '}
                <span className="font-mono font-bold text-error select-all">@{targetUser.username}</span> or{' '}
                <span className="font-mono font-bold text-error select-all">{targetUser.username}</span>:
              </span>
            ) : (
              <span>
                To confirm deleting all {bulkUsers.length} closed accounts, type{' '}
                <span className="font-mono font-bold text-error select-all">DELETE</span>:
              </span>
            )}
          </label>
          <input
            id="permDeleteConfirm"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={isDeleting}
            placeholder={isSingle && targetUser ? `@${targetUser.username}` : 'DELETE'}
            className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-xs font-mono font-bold text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-error/30 border border-outline-variant/30 disabled:opacity-50"
            autoComplete="off"
            autoFocus
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={isSingle ? handleDeleteSingle : handleDeleteBulk}
            disabled={!canConfirm}
            className="h-11 rounded-xl bg-error hover:bg-error/90 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{isSingle ? 'Delete Forever' : `Delete All (${bulkUsers.length})`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
