import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockStorage } from '../../services/mockStorage';
import { isFirebaseConfigured, isMockEnabled, db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { UserProfile, BankAccount, TransactionRecord } from '../../types';
import { formatCentsToUSD, maskAccountNumber } from '../../utils/format';
import { UserStatusBadge } from '../../components/common/StatusBadge';
import { TableRowSkeleton } from '../../components/common/SkeletonLoader';
import { ErrorState } from '../../components/common/ErrorState';
import { getFriendlyError, withTimeout } from '../../utils/errorMessages';
import {
  Users,
  Building,
  TrendingUp,
  UserPlus,
  Receipt,
  Search,
  Lock,
  Edit3,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ title: string; message: string } | null>(null);

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    if (isFirebaseConfigured() && db) {
      try {
        const [userSnap, acctSnap, txSnap] = await withTimeout(
          Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'accounts')),
            getDocs(collection(db, 'transactions')),
          ]),
          10000
        );
        const userList = userSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as UserProfile[];
        setUsers(userList.filter((u) => u.role === 'customer'));

        const acctList = acctSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BankAccount[];
        setAccounts(acctList);

        const txList = txSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as TransactionRecord[];
        setTransactions(txList);
      } catch (err) {
        console.error('Error loading admin overview stats:', err);
        setLoadError(getFriendlyError(err));
      } finally {
        setIsLoading(false);
      }
    } else if (isMockEnabled) {
      setUsers(mockStorage.getUsers().filter((u) => u.role === 'customer'));
      setAccounts(mockStorage.getUsers().map((u) => mockStorage.getAccountByOwner(u.uid)).filter(Boolean) as BankAccount[]);
      setTransactions(mockStorage.getAllTransactions());
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Compute stats from real data
  const totalCustomers = users.length;
  const totalFundsCents = accounts.reduce((acc, a) => acc + (a.status === 'active' ? a.balanceCents : 0), 0);
  
  // Transactions today
  const todayTransactions = transactions.filter((t) => {
    const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  });

  const todayVolumeCents = todayTransactions.reduce((acc, t) => acc + t.amountCents, 0);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* Live System Control Banner */}
      <div className="bg-surface-container-high px-4 py-3 rounded-xl flex items-center justify-between text-xs text-on-surface border border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="font-semibold text-on-surface">Admin Portal • Institutional Control</span>
        </div>
        <div className="flex items-center gap-1.5 text-secondary">
          <Clock className="w-3.5 h-3.5" />
          <span>Live Ledger Sync Active</span>
        </div>
      </div>

      {loadError && users.length === 0 ? (
        <ErrorState
          title={loadError.title}
          message={loadError.message}
          onRetry={load}
        />
      ) : (
        <>
          {/* Metric Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Total Customers */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real-time</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-medium text-on-surface-variant block">Total Registered Customers</span>
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1 block">
              {isLoading ? '...' : totalCustomers.toLocaleString()}
            </span>
            <span className="text-[11px] text-secondary mt-1 block">Active client directory</span>
          </div>
        </div>

        {/* Card 2: Total Funds */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <span>Active</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-medium text-on-surface-variant block">Total Funds Under Management</span>
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1 font-ledger-numerical block">
              {isLoading ? '...' : formatCentsToUSD(totalFundsCents)}
            </span>
            <span className="text-[11px] text-secondary mt-1 block">Aggregate customer balances</span>
          </div>
        </div>

        {/* Card 3: Daily Transactions */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-secondary-container/50 text-secondary flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              Today
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-medium text-on-surface-variant block">Transactions Today</span>
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1 block">
              {isLoading ? '...' : todayTransactions.length}
            </span>
            <span className="text-[11px] text-secondary mt-1 block">
              Volume: {formatCentsToUSD(todayVolumeCents)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Admin Action Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/admin/create-account"
          className="h-12 bg-primary-container hover:bg-primary text-on-primary font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Create New Customer</span>
        </Link>
        <Link
          to="/admin/customers"
          className="h-12 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-semibold text-xs sm:text-sm rounded-xl border border-outline-variant/30 shadow-xs flex items-center justify-center gap-2 transition-all"
        >
          <Users className="w-4 h-4" />
          <span>Manage Customer Directory</span>
        </Link>
        <Link
          to="/admin/transactions"
          className="h-12 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-semibold text-xs sm:text-sm rounded-xl border border-outline-variant/30 shadow-xs flex items-center justify-center gap-2 transition-all"
        >
          <Receipt className="w-4 h-4" />
          <span>View Master Ledger</span>
        </Link>
      </div>

      {/* Recent Customer Directory Preview */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Customer Directory Preview</h2>
            <p className="text-xs text-on-surface-variant">Active accounts and balance controls</p>
          </div>
          <Link
            to="/admin/customers"
            className="text-xs font-semibold text-tertiary hover:underline flex items-center gap-1"
          >
            <span>View All ({users.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <TableRowSkeleton count={3} />
        ) : users.length > 0 ? (
          <div className="space-y-3">
            {users.slice(0, 4).map((u) => {
              const userAccount = accounts.find((a) => a.ownerUid === u.uid);
              return (
                <div
                  key={u.uid}
                  className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {u.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">{u.name}</span>
                        <UserStatusBadge status={u.status} />
                      </div>
                      <span className="text-xs text-on-surface-variant font-mono">
                        @{u.username} • Acct: {userAccount ? userAccount.accountNumber : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-on-surface-variant block">Balance</span>
                      <span className="text-sm font-bold text-on-surface font-ledger-numerical">
                        {userAccount ? formatCentsToUSD(userAccount.balanceCents) : '$0.00'}
                      </span>
                    </div>
                    <Link
                      to={`/admin/customers?focus=${u.uid}`}
                      className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-white text-xs font-semibold text-tertiary shadow-xs"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-on-surface-variant">
            No customers registered yet. Click &quot;+ Create New Customer&quot; above to create the first account!
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};
