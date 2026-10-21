import React, { useState, useEffect, useMemo } from 'react';
import { mockStorage } from '../../services/mockStorage';
import { isFirebaseConfigured, db } from '../../services/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { TransactionRecord } from '../../types';
import { formatCentsToUSD, formatDateTime } from '../../utils/format';
import { TransactionBadge } from '../../components/common/StatusBadge';
import { TableRowSkeleton } from '../../components/common/SkeletonLoader';
import {
  Receipt,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const AdminTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit' | 'adjustment'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(15);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      if (!isFirebaseConfigured() || !db) {
        setTransactions(mockStorage.getAllTransactions());
        setIsLoading(false);
      } else {
        try {
          const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
          const snap = await getDocs(q);
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TransactionRecord[];
          setTransactions(list);
        } catch (err) {
          console.error('Error fetching admin master transactions:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const partyMatch = tx.counterpartyName.toLowerCase().includes(q);
        const acctMatch = tx.counterpartyAccount.includes(q);
        const noteMatch = (tx.note || '').toLowerCase().includes(q);
        if (!partyMatch && !acctMatch && !noteMatch) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Institutional Ledger</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Audit log of all credits, debits, transfers, and administrative adjustments
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
          {filtered.length} Total Records
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by counterparty, note, or account..."
            className="w-full h-11 pl-10 pr-4 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              typeFilter === 'all'
                ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('credit')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              typeFilter === 'credit'
                ? 'bg-surface-container-lowest text-emerald-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Credits
          </button>
          <button
            onClick={() => setTypeFilter('debit')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              typeFilter === 'debit'
                ? 'bg-surface-container-lowest text-rose-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Debits
          </button>
          <button
            onClick={() => setTypeFilter('adjustment')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              typeFilter === 'adjustment'
                ? 'bg-surface-container-lowest text-blue-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Adjustments
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {isLoading ? (
          <TableRowSkeleton count={5} />
        ) : filtered.length > 0 ? (
          filtered.slice(0, displayLimit).map((tx) => (
            <div
              key={tx.id}
              className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs hover:bg-surface-container-low transition-colors flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    tx.type === 'credit'
                      ? 'bg-emerald-500/15 text-emerald-700'
                      : tx.type === 'adjustment'
                      ? 'bg-blue-500/15 text-blue-700'
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
                  <span className="text-on-surface-variant truncate">
                    {tx.note || 'Ledger transaction'}
                  </span>
                  <span className="text-outline text-[11px] mt-0.5">
                    {formatDateTime(tx.createdAt)} • Acct #{tx.counterpartyAccount} • Ref: {tx.id}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`text-base font-bold font-ledger-numerical block ${
                    tx.type === 'credit'
                      ? 'text-emerald-700'
                      : tx.type === 'adjustment'
                      ? 'text-blue-700'
                      : 'text-on-surface'
                  }`}
                >
                  {tx.type === 'credit'
                    ? `+${formatCentsToUSD(tx.amountCents)}`
                    : tx.type === 'adjustment'
                    ? `±${formatCentsToUSD(tx.amountCents)}`
                    : `-${formatCentsToUSD(tx.amountCents)}`}
                </span>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  Balance After: {formatCentsToUSD(tx.balanceAfterCents)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface-container-lowest p-12 rounded-2xl text-center border border-outline-variant/30">
            <Receipt className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
            <h4 className="text-sm font-bold text-on-surface">No ledger transactions found</h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Try adjusting your search criteria or filter.
            </p>
          </div>
        )}

        {filtered.length > displayLimit && (
          <div className="text-center pt-2">
            <button
              onClick={() => setDisplayLimit((prev) => prev + 15)}
              className="px-6 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs shadow-xs"
            >
              Load More ({filtered.length - displayLimit} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
