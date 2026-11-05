import React, { useState } from 'react';
import { TransactionRecord } from '../../types';
import { formatCentsToUSD, formatDateTime } from '../../utils/format';
import { TransactionBadge } from './StatusBadge';
import { TransactionDetailModal } from './TransactionDetailModal';

interface TransactionRowProps {
  tx: TransactionRecord;
  variant?: 'dashboard' | 'history';
}

export const TransactionRow: React.FC<TransactionRowProps> = React.memo(({ tx, variant = 'history' }) => {
  const [showDetail, setShowDetail] = useState(false);
  const isDashboard = variant === 'dashboard';
  const isAch = tx.transferType === 'ach';

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowDetail(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDetail(true);
          }
        }}
        className={
          isDashboard
            ? 'p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99]'
            : 'p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs hover:bg-surface-container-low transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99]'
        }
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
              tx.type === 'credit'
                ? 'bg-emerald-500/15 text-emerald-700'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {tx.type === 'credit' ? '+' : tx.type === 'adjustment' ? '±' : '-'}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-on-surface truncate">
                {tx.counterpartyName}
              </span>
              {isAch ? (
                <div className="inline-flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                    ACH transfer
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-800">
                    Pending
                  </span>
                </div>
              ) : (
                <TransactionBadge type={tx.type} status={tx.status} />
              )}
            </div>
            <span className="text-xs text-on-surface-variant truncate">
              {tx.note || (isAch ? 'ACH External Transfer' : 'Direct Account Transfer')}
            </span>
            <span className="text-[11px] text-outline mt-0.5">
              {formatDateTime(tx.createdAt)}
              {!isDashboard && ` • Acct: ${tx.counterpartyAccount || (isAch ? 'External ACH' : 'Internal')}`}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`text-base font-bold font-ledger-numerical block ${
              tx.type === 'credit' ? 'text-emerald-700' : 'text-on-surface'
            }`}
          >
            {tx.type === 'credit'
              ? `+${formatCentsToUSD(tx.amountCents)}`
              : tx.type === 'adjustment'
              ? formatCentsToUSD(tx.amountCents)
              : `-${formatCentsToUSD(tx.amountCents)}`}
          </span>
          {typeof tx.balanceAfterCents === 'number' && (
            <span className={`text-[11px] text-on-surface-variant ${!isDashboard ? 'font-mono' : ''}`}>
              {isDashboard ? 'Bal: ' : 'Running Bal: '}
              {formatCentsToUSD(tx.balanceAfterCents)}
            </span>
          )}
        </div>
      </div>

      {showDetail && (
        <TransactionDetailModal tx={tx} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
});

TransactionRow.displayName = 'TransactionRow';
