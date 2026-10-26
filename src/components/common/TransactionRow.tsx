import React from 'react';
import { TransactionRecord } from '../../types';
import { formatCentsToUSD, formatDateTime } from '../../utils/format';
import { TransactionBadge } from './StatusBadge';

interface TransactionRowProps {
  tx: TransactionRecord;
  variant?: 'dashboard' | 'history';
}

export const TransactionRow: React.FC<TransactionRowProps> = React.memo(({ tx, variant = 'history' }) => {
  const isDashboard = variant === 'dashboard';

  return (
    <div
      className={
        isDashboard
          ? 'p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-3'
          : 'p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs hover:bg-surface-container-low transition-colors flex items-center justify-between gap-3'
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-on-surface truncate">
              {tx.counterpartyName}
            </span>
            <TransactionBadge type={tx.type} status={tx.status} />
          </div>
          <span className="text-xs text-on-surface-variant truncate">
            {tx.note || 'Direct Account Transfer'}
          </span>
          <span className="text-[11px] text-outline mt-0.5">
            {formatDateTime(tx.createdAt)}
            {!isDashboard && ` • Acct: ${tx.counterpartyAccount || 'Internal'}`}
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
  );
});

TransactionRow.displayName = 'TransactionRow';
