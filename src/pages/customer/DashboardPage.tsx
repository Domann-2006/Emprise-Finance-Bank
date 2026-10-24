import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerAccount,
  subscribeToAccount,
  subscribeToTransactions,
} from '../../services/banking';
import { BankAccount, TransactionRecord } from '../../types';
import { formatCentsToUSD, maskAccountNumber, formatDateTime } from '../../utils/format';
import { CardSkeleton, TransactionSkeletonList } from '../../components/common/SkeletonLoader';
import { TransactionBadge } from '../../components/common/StatusBadge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { ErrorState } from '../../components/common/ErrorState';
import { getFriendlyError, withTimeout } from '../../utils/errorMessages';
import {
  Wallet,
  ArrowUpRight,
  Receipt,
  Eye,
  EyeOff,
  Shield,
  ArrowRightLeft,
  Banknote,
  FileText,
  ScanLine,
  TrendingUp,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isLoadingTxns, setIsLoadingTxns] = useState(true);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [comingSoonToast, setComingSoonToast] = useState<string | null>(null);
  const [demoSkeletonMode, setDemoSkeletonMode] = useState(false);
  const [loadError, setLoadError] = useState<{ title: string; message: string } | null>(null);

  const loadData = async () => {
    if (!user) return;
    setIsLoadingAccount(true);
    setLoadError(null);
    try {
      const acct = await withTimeout(getCustomerAccount(user.uid), 10000);
      setAccount(acct);
      setIsLoadingAccount(false);

      if (acct) {
        setIsLoadingTxns(true);
        subscribeToAccount(acct.id, (updatedAcct) => {
          setAccount(updatedAcct);
        });

        subscribeToTransactions(acct.id, (txns) => {
          setTransactions(txns);
          setIsLoadingTxns(false);
        });
      } else {
        setIsLoadingTxns(false);
      }
    } catch (err) {
      setLoadError(getFriendlyError(err));
      setIsLoadingAccount(false);
      setIsLoadingTxns(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const showComingSoon = (feature: string) => {
    setComingSoonToast(`${feature} is coming soon to digital banking.`);
    setTimeout(() => setComingSoonToast(null), 3000);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'income') return tx.type === 'credit';
    if (activeFilter === 'expense') return tx.type === 'debit';
    return true;
  });

  const recentTransactions = filteredTransactions.slice(0, 5);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* Toast Notification */}
      {comingSoonToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-on-tertiary-fixed text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-medium flex items-center gap-2 animate-bounce">
          <Info className="w-4 h-4 text-primary-container" />
          <span>{comingSoonToast}</span>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-outline-variant/30 flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <UserAvatar user={user} size="lg" className="w-12 h-12" />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary-container rounded-full ring-2 ring-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-on-surface truncate">Welcome back, {user?.name}!</h1>
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            </div>
            <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
              <span>Member @{user?.username}</span>
              <span>•</span>
              <span>Status: <strong className="text-primary font-semibold capitalize">{user?.status || 'Active'}</strong></span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setDemoSkeletonMode(!demoSkeletonMode)}
          className="text-xs text-on-surface-variant hover:text-primary p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center gap-1"
          title="Toggle preview skeleton loading state"
        >
          <span className="hidden sm:inline">Skeleton:</span>
          <span className="font-bold">{demoSkeletonMode ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Primary Account Card (Hero Navy Card matching Stitch Design) */}
      {loadError && !account ? (
        <ErrorState
          title={loadError.title}
          message={loadError.message}
          onRetry={loadData}
        />
      ) : isLoadingAccount || demoSkeletonMode ? (
        <CardSkeleton />
      ) : account ? (
        <div className="relative overflow-hidden bg-on-secondary-fixed text-on-secondary rounded-2xl p-6 sm:p-7 shadow-lg flex flex-col gap-6">
          {/* Ambient Lighting Accents */}
          <div className="absolute -right-16 -top-16 w-52 h-52 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-tertiary/25 rounded-full blur-2xl pointer-events-none" />

          {/* Card Top: Account Type & Masked Account Number */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary-fixed" />
              <span className="text-xs sm:text-sm font-medium text-secondary-fixed tracking-wide">
                Community {account.type} ({maskAccountNumber(account.accountNumber)})
              </span>
            </div>

            <button
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="flex items-center gap-1.5 text-xs text-secondary-fixed-dim hover:text-white py-1 px-2.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isBalanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{isBalanceVisible ? 'Hide Balance' : 'Show Balance'}</span>
            </button>
          </div>

          {/* Balance Numbers */}
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary-fixed-dim">
              Available Balance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-ledger-numerical">
                {isBalanceVisible ? formatCentsToUSD(account.balanceCents) : '$ •••••••'}
              </span>
              <span className="text-xs font-semibold text-secondary-fixed">USD</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-secondary-fixed-dim">
              <span>Account Number: <strong className="text-white font-mono">{account.accountNumber}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Cleared Funds</span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="relative z-10 grid grid-cols-2 gap-3 pt-1">
            <Link
              to="/transfer"
              className="flex items-center justify-center gap-2 bg-primary-container hover:bg-primary text-on-primary font-bold text-sm py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Send Money</span>
            </Link>
            <Link
              to="/history"
              className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/20 text-white font-bold text-sm py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
            >
              <Receipt className="w-4 h-4" />
              <span>View History</span>
            </Link>
          </div>

          {/* Quick Utilities Row (With coming soon tooltips for extras) */}
          <div className="relative z-10 pt-2 grid grid-cols-4 gap-2 border-t border-white/10">
            <Link
              to="/transfer"
              className="flex flex-col items-center gap-1.5 py-1 text-center group"
            >
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-105 transition-transform">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-secondary-fixed">Transfer</span>
            </Link>

            <button
              onClick={() => showComingSoon('Bill Pay')}
              className="flex flex-col items-center gap-1.5 py-1 text-center group"
            >
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-105 transition-transform">
                <Banknote className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-secondary-fixed">Pay Bills</span>
            </button>

            <button
              onClick={() => showComingSoon('Mobile Deposit')}
              className="flex flex-col items-center gap-1.5 py-1 text-center group"
            >
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-105 transition-transform">
                <ScanLine className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-secondary-fixed">Deposit</span>
            </button>

            <button
              onClick={() => showComingSoon('PDF Statements')}
              className="flex flex-col items-center gap-1.5 py-1 text-center group"
            >
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-secondary-fixed">Statements</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-6 rounded-2xl text-center border border-outline-variant/30">
          <p className="text-sm text-on-surface-variant">No active account found. Please contact support.</p>
        </div>
      )}

      {/* Secondary Savings Info Card */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                High-Yield Community Savings
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold shrink-0">
                4.25% APY
              </span>
            </div>
            <span className="text-sm font-bold text-on-surface mt-0.5">
              Available for instant add-on
            </span>
          </div>
        </div>
        <button
          onClick={() => showComingSoon('Secondary Savings Account creation')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Card Lock / Security Pill Banner */}
      <div className="bg-surface-container-low px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs text-on-surface-variant border border-outline-variant/20">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <p className="truncate">
            <strong className="text-on-surface font-semibold">Card lock protection active</strong> • Zero-liability fraud guard
          </p>
        </div>
        <button
          onClick={() => showComingSoon('Card Controls & Freezing')}
          className="text-primary font-bold hover:underline shrink-0 flex items-center gap-0.5"
        >
          <span>Manage</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-on-surface">Recent Activity</h2>
            <span className="w-2 h-2 rounded-full bg-primary-container" />
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-tertiary hover:underline flex items-center gap-1"
          >
            <span>See All History</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter Controls (Tabs) */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl w-fit">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveFilter('income')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'income'
                ? 'bg-surface-container-lowest text-emerald-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Money In
          </button>
          <button
            onClick={() => setActiveFilter('expense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'expense'
                ? 'bg-surface-container-lowest text-rose-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Money Out
          </button>
        </div>

        {/* Transactions List */}
        {isLoadingTxns || demoSkeletonMode ? (
          <TransactionSkeletonList count={4} />
        ) : recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
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
                      {formatDateTime(tx.createdAt)}
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
                    <span className="text-[11px] text-on-surface-variant">
                      Bal: {formatCentsToUSD(tx.balanceAfterCents)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-on-surface">No recent transactions</h4>
            <p className="text-xs text-on-surface-variant max-w-xs">
              When you send or receive funds, your transaction history will appear here in real time.
            </p>
            <Link
              to="/transfer"
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Make your first transfer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
