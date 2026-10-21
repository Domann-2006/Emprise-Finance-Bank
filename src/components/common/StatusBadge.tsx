import React from 'react';
import { UserStatus, TransactionType, TransactionStatus } from '../../types';

export const UserStatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        <span>Active</span>
      </span>
    );
  }

  if (status === 'disabled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-800 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        <span>Disabled</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 border border-rose-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
      <span>Closed</span>
    </span>
  );
};

export const TransactionBadge: React.FC<{
  type: TransactionType;
  status: TransactionStatus;
}> = ({ type, status }) => {
  if (type === 'credit') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
        Credit
      </span>
    );
  }

  if (type === 'adjustment') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
        Adjustment
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
      Debit
    </span>
  );
};
