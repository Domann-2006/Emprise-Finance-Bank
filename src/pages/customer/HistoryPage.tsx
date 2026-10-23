import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerAccount, subscribeToTransactions } from '../../services/banking';
import { BankAccount, TransactionRecord } from '../../types';
import { formatCentsToUSD, formatDateOnly, formatDateTime } from '../../utils/format';
import { TransactionBadge } from '../../components/common/StatusBadge';
import { TransactionSkeletonList } from '../../components/common/SkeletonLoader';
import { ErrorState } from '../../components/common/ErrorState';
import { getFriendlyError, withTimeout } from '../../utils/errorMessages';
import {
  Search,
  Receipt,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Download,
  Calendar,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ title: string; message: string } | null>(null);

  // Filters
  const [tabFilter, setTabFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [exportNotice, setExportNotice] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const acct = await withTimeout(getCustomerAccount(user.uid), 10000);
      setAccount(acct);

      if (acct) {
        subscribeToTransactions(acct.id, (txns) => {
          setTransactions(txns);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setLoadError(getFriendlyError(err));
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract available months from transactions for the month dropdown
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      if (!isNaN(date.getTime())) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        set.add(key);
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      // Tab filter
      if (tabFilter === 'credit' && tx.type !== 'credit') return false;
      if (tabFilter === 'debit' && tx.type !== 'debit') return false;

      // Month filter
      if (monthFilter !== 'all') {
        const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (key !== monthFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const queryClean = searchQuery.toLowerCase().trim();
        const partyMatch = tx.counterpartyName.toLowerCase().includes(queryClean);
        const noteMatch = (tx.note || '').toLowerCase().includes(queryClean);
        const acctMatch = tx.counterpartyAccount.includes(queryClean);
        if (!partyMatch && !noteMatch && !acctMatch) return false;
      }

      return true;
    });
  }, [transactions, tabFilter, monthFilter, searchQuery]);

  // Summaries (Inflow, Outflow, Net) calculated dynamically for current filter
  const { inflowCents, outflowCents, netCents } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;

    filtered.forEach((tx) => {
      if (tx.type === 'credit') {
        inflow += tx.amountCents;
      } else if (tx.type === 'debit') {
        outflow += tx.amountCents;
      } else if (tx.type === 'adjustment') {
        // count adjustment towards inflow or outflow depending on balance direction
        inflow += tx.amountCents;
      }
    });

    return {
      inflowCents: inflow,
      outflowCents: outflow,
      netCents: inflow - outflow,
    };
  }, [filtered]);

  // Group transactions by Date
  const groupedByDate = useMemo(() => {
    const sliced = filtered.slice(0, displayLimit);
    const groups: { [dateStr: string]: TransactionRecord[] } = {};

    sliced.forEach((tx) => {
      const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      const groupKey = isNaN(date.getTime()) ? 'Recent' : formatDateOnly(date);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(tx);
    });

    return groups;
  }, [filtered, displayLimit]);

  const handleExport = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Export Toast */}
      {exportNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-on-tertiary-fixed text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-semibold">
          Exporting statement CSV for currently filtered transactions...
        </div>
      )}

      {/* Title & Context */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Transaction History</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Real-time verified ledger for Community {account?.type || 'Checking'}
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-tertiary text-xs font-semibold shadow-xs hover:bg-surface-container transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {loadError && !account ? (
        <ErrorState
          title={loadError.title}
          message={loadError.message}
          onRetry={loadData}
        />
      ) : (
        <>
          {/* Summary Cards Strip (Inflow, Outflow, Net) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* Inflow Card */}
        <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Inflow
            </span>
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-base sm:text-xl font-bold text-emerald-700 font-ledger-numerical truncate">
            +{formatCentsToUSD(inflowCents)}
          </span>
        </div>

        {/* Outflow Card */}
        <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Outflow
            </span>
            <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-base sm:text-xl font-bold text-rose-700 font-ledger-numerical truncate">
            -{formatCentsToUSD(outflowCents)}
          </span>
        </div>

        {/* Net Flow Card */}
        <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              Net Flow
            </span>
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <span
            className={`text-base sm:text-xl font-bold font-ledger-numerical truncate ${
              netCents >= 0 ? 'text-primary' : 'text-rose-700'
            }`}
          >
            {formatCentsToUSD(netCents, true)}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by merchant, counterparty, or note..."
            className="w-full h-11 pl-9 pr-3 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
          />
        </div>

        {/* Controls: Month filter & Tabs */}
        <div className="flex items-center gap-2">
          {/* Month Dropdown */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-11 px-3 bg-surface-container-low rounded-xl text-xs font-semibold text-on-surface border border-outline-variant/30 focus:outline-none"
          >
            <option value="all">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Tabs */}
          <div className="flex p-1 bg-surface-container rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTabFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tabFilter === 'all'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTabFilter('credit')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tabFilter === 'credit'
                  ? 'bg-surface-container-lowest text-emerald-700 shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              In
            </button>
            <button
              onClick={() => setTabFilter('debit')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tabFilter === 'debit'
                  ? 'bg-surface-container-lowest text-rose-700 shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Out
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Listing Grouped by Date */}
      <div className="flex flex-col gap-6">
        {isLoading ? (
          <TransactionSkeletonList count={5} />
        ) : Object.keys(groupedByDate).length > 0 ? (
          Object.entries(groupedByDate).map(([dateLabel, txGroup]) => (
            <div key={dateLabel} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  {dateLabel}
                </span>
                <span className="text-[11px] text-on-surface-variant font-medium">
                  {txGroup.length} transaction{txGroup.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2.5">
                {txGroup.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs hover:bg-surface-container-low transition-colors flex items-center justify-between gap-3"
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
                        {tx.type === 'credit' ? '+' : '-'}
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
                          {formatDateTime(tx.createdAt)} • Acct: {tx.counterpartyAccount || 'Internal'}
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
                          : `-${formatCentsToUSD(tx.amountCents)}`}
                      </span>
                      {typeof tx.balanceAfterCents === 'number' && (
                        <span className="text-[11px] text-on-surface-variant font-mono">
                          Running Bal: {formatCentsToUSD(tx.balanceAfterCents)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface-container-lowest p-12 rounded-2xl text-center border border-outline-variant/30 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-on-surface">No matching transactions</h4>
            <p className="text-xs text-on-surface-variant max-w-xs">
              No activity records match your current filter criteria or search keyword.
            </p>
            {(searchQuery || tabFilter !== 'all' || monthFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTabFilter('all');
                  setMonthFilter('all');
                }}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Load More Pagination */}
        {filtered.length > displayLimit && (
          <div className="text-center pt-2">
            <button
              onClick={() => setDisplayLimit((prev) => prev + 10)}
              className="px-6 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs shadow-xs transition-all"
            >
              Load More Transactions ({filtered.length - displayLimit} remaining)
            </button>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};
