import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerAccount, subscribeToTransactions } from '../../services/banking';
import { BankAccount, TransactionRecord } from '../../types';
import { formatCentsToUSD, formatDateOnly } from '../../utils/format';
import { TransactionRow } from '../../components/common/TransactionRow';
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

  const unsubscribeTxnsRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [tabFilter, setTabFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [exportNotice, setExportNotice] = useState(false);

  const cleanupListeners = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (unsubscribeTxnsRef.current) {
      unsubscribeTxnsRef.current();
      unsubscribeTxnsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupListeners();
    };
  }, [cleanupListeners]);

  const loadData = useCallback(async () => {
    if (!user) return;
    cleanupListeners();
    setIsLoading(true);
    setLoadError(null);
    try {
      const acct = await withTimeout(getCustomerAccount(user.uid), 10000);
      setAccount(acct);

      if (acct) {
        // 10-second safety timeout: if no snapshot arrives, stop skeleton and show ErrorState
        timeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setLoadError({
            title: 'Connection Timed Out',
            message: 'Unable to load transaction records. Please check your network connection and try again.',
          });
        }, 10000);

        unsubscribeTxnsRef.current = subscribeToTransactions(
          acct.id,
          (txns) => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setTransactions(txns);
            setIsLoading(false);
            setLoadError(null);
          },
          (err) => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setLoadError(getFriendlyError(err));
            setIsLoading(false);
          }
        );
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      cleanupListeners();
      setLoadError(getFriendlyError(err));
      setIsLoading(false);
    }
  }, [user, cleanupListeners]);

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

      {loadError ? (
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
                  <TransactionRow key={tx.id} tx={tx} variant="history" />
                ))}
              </div>
            </div>
          ))
        ) : transactions.length === 0 ? (
          <div className="bg-surface-container-lowest p-12 rounded-2xl text-center border border-outline-variant/30 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-on-surface">No transactions yet</h4>
            <p className="text-xs text-on-surface-variant max-w-xs">
              When you send or receive transfers, they will appear here in real time.
            </p>
          </div>
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
