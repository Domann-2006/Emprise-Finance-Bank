import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { TransactionRecord } from '../../types';
import { formatCentsToUSD, formatDateTime, maskAccountNumber } from '../../utils/format';
import { X, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Building } from 'lucide-react';
import { ACH_PROCESSING_TEXT } from '../../config/brand';

interface TransactionDetailModalProps {
  tx: TransactionRecord | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ tx, onClose }) => {
  useEffect(() => {
    if (!tx) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tx, onClose]);

  if (!tx || typeof document === 'undefined') return null;

  const isCredit = tx.type === 'credit' || (tx.type as string) === 'transfer_in';
  const isAch = tx.transferType === 'ach';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5 border border-outline-variant/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isCredit
                  ? 'bg-emerald-500/15 text-emerald-700'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {isCredit ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : isAch ? (
                <Building className="w-5 h-5 text-tertiary" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">Transaction Details</h3>
              <span className="text-[11px] text-on-surface-variant font-medium">
                {isAch ? 'ACH External Debit' : isCredit ? 'Credit Transfer' : 'Direct Account Transfer'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount & Status Hero */}
        <div className="text-center py-3 bg-surface-container-low rounded-2xl border border-outline-variant/20">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
            {isCredit ? 'Amount Received' : 'Amount Sent'}
          </span>
          <div
            className={`text-3xl font-extrabold font-ledger-numerical mt-0.5 ${
              isCredit ? 'text-emerald-700' : 'text-on-surface'
            }`}
          >
            {isCredit
              ? `+${formatCentsToUSD(tx.amountCents)}`
              : `-${formatCentsToUSD(tx.amountCents)}`}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            {isAch ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 border border-amber-500/20">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>Pending</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Completed</span>
              </span>
            )}
          </div>
        </div>

        {/* Details Table */}
        <div className="bg-surface-container-low rounded-xl p-4 text-xs space-y-2.5 border border-outline-variant/20">
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant">{isCredit ? 'Sender' : 'Recipient'}:</span>
            <span className="font-bold text-on-surface">{tx.counterpartyName}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant">Account:</span>
            <span className="font-mono text-on-surface">
              {tx.counterpartyAccount ? maskAccountNumber(tx.counterpartyAccount) : 'Institutional'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant">Date & Time:</span>
            <span className="text-on-surface">{formatDateTime(tx.createdAt)}</span>
          </div>

          {/* ACH Specific Details */}
          {isAch && (
            <>
              {tx.routingNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Bank routing:</span>
                  <span className="font-mono font-semibold text-on-surface">{tx.routingNumber}</span>
                </div>
              )}
              {tx.accountType && (
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Account type:</span>
                  <span className="font-semibold text-on-surface">{tx.accountType}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Transfer method:</span>
                <span className="font-semibold text-primary">ACH ({ACH_PROCESSING_TEXT})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Expected arrival:</span>
                <span className="font-semibold text-on-surface">{ACH_PROCESSING_TEXT}</span>
              </div>
            </>
          )}

          {!isAch && (
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Transfer method:</span>
              <span className="font-semibold text-emerald-700">Instant Internal Ledger</span>
            </div>
          )}

          {tx.note && (
            <div className="flex justify-between items-start pt-1 border-t border-outline-variant/15">
              <span className="text-on-surface-variant">Memo:</span>
              <span className="text-on-surface text-right max-w-[220px] break-words">{tx.note}</span>
            </div>
          )}

          {typeof tx.balanceAfterCents === 'number' && (
            <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Running Balance:</span>
              <span className="font-mono font-bold text-on-surface font-ledger-numerical">
                {formatCentsToUSD(tx.balanceAfterCents)}
              </span>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="h-11 w-full bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
