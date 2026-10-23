import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { mockStorage } from '../../services/mockStorage';
import { isFirebaseConfigured, isMockEnabled, db } from '../../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { UserProfile, BankAccount } from '../../types';
import { formatCentsToUSD, maskAccountNumber, parseUSDToCents } from '../../utils/format';
import { UserStatusBadge } from '../../components/common/StatusBadge';
import { TableRowSkeleton } from '../../components/common/SkeletonLoader';
import { editCustomerBalance, updateCustomerStatus } from '../../services/banking';
import {
  Search,
  Wallet,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  UserCheck,
  UserX,
  Power,
  Info,
  Building,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  Users,
  RotateCcw,
} from 'lucide-react';

export const AdminCustomersPage: React.FC = () => {
  const location = useLocation();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'closed'>('all');

  // Edit Balance Modal State
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [targetAccount, setTargetAccount] = useState<BankAccount | null>(null);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [adjustmentDirection, setAdjustmentDirection] = useState<'add' | 'deduct'>('add');
  const [adjustmentAmountStr, setAdjustmentAmountStr] = useState('100.00');
  const [adjustmentNote, setAdjustmentNote] = useState('Administrative ledger adjustment');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  // Status & Delete Dialog
  const [deleteWarningUser, setDeleteWarningUser] = useState<UserProfile | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Tooltip notice for Reset PW
  const [showPwNotice, setShowPwNotice] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    if (isFirebaseConfigured() && db) {
      try {
        const userSnap = await getDocs(collection(db, 'users'));
        const userList = userSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as UserProfile[];
        setUsers(userList.filter((u) => u.role === 'customer'));

        const acctSnap = await getDocs(collection(db, 'accounts'));
        const acctList = acctSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as BankAccount[];
        setAccounts(acctList);
      } catch (err) {
        console.error('Error fetching admin customer directory:', err);
      } finally {
        setIsLoading(false);
      }
    } else if (isMockEnabled) {
      setUsers(mockStorage.getUsers().filter((u) => u.role === 'customer'));
      setAccounts(
        mockStorage
          .getUsers()
          .map((u) => mockStorage.getAccountByOwner(u.uid))
          .filter(Boolean) as BankAccount[]
      );
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Filtered customer list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Status filter
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const userAccount = accounts.find((a) => a.ownerUid === u.uid);
        const nameMatch = u.name.toLowerCase().includes(q);
        const userMatch = u.username.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const acctMatch = (userAccount?.accountNumber || '').includes(q);

        if (!nameMatch && !userMatch && !emailMatch && !acctMatch) return false;
      }

      return true;
    });
  }, [users, accounts, statusFilter, searchQuery]);

  // Open Edit Balance Modal
  const openBalanceModal = (userItem: UserProfile) => {
    const acct = accounts.find((a) => a.ownerUid === userItem.uid);
    if (!acct) {
      triggerToast('Customer account record missing.');
      return;
    }
    setTargetUser(userItem);
    setTargetAccount(acct);
    setAdjustmentDirection('add');
    setAdjustmentAmountStr('100.00');
    setAdjustmentNote('Administrative ledger balance adjustment');
    setAdjustmentError(null);
    setIsBalanceModalOpen(true);
  };

  // Calculate Projected Balance
  const projectedBalanceCents = useMemo(() => {
    if (!targetAccount) return 0;
    const deltaCents = parseUSDToCents(adjustmentAmountStr);
    if (adjustmentDirection === 'add') {
      return targetAccount.balanceCents + deltaCents;
    } else {
      return Math.max(0, targetAccount.balanceCents - deltaCents);
    }
  }, [targetAccount, adjustmentAmountStr, adjustmentDirection]);

  // Submit Balance Adjustment
  const handleConfirmBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;
    setAdjustmentError(null);

    const deltaCents = parseUSDToCents(adjustmentAmountStr);
    if (deltaCents <= 0) {
      setAdjustmentError('Please enter an adjustment amount greater than $0.00.');
      return;
    }

    if (!adjustmentNote.trim()) {
      setAdjustmentError('Audit note is required for ledger tracking.');
      return;
    }

    if (adjustmentDirection === 'deduct' && targetAccount.balanceCents - deltaCents < 0) {
      setAdjustmentError('Deduction would result in a negative balance.');
      return;
    }

    setIsSubmittingAdjustment(true);
    try {
      const result = await editCustomerBalance(
        targetAccount.id,
        deltaCents,
        adjustmentDirection,
        adjustmentNote.trim()
      );

      // Update state
      setAccounts((prev) =>
        prev.map((a) => (a.id === targetAccount.id ? { ...a, balanceCents: result.newBalanceCents } : a))
      );
      setIsBalanceModalOpen(false);
      triggerToast(
        `Balance adjusted for ${targetUser?.name}. New balance: ${formatCentsToUSD(result.newBalanceCents)}`
      );
    } catch (err: any) {
      setAdjustmentError(err.message || 'Balance adjustment failed.');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Toggle Enable / Disable
  const handleToggleStatus = async (userItem: UserProfile) => {
    const nextStatus = userItem.status === 'active' ? 'disabled' : 'active';
    try {
      await updateCustomerStatus(userItem.uid, nextStatus);
      setUsers((prev) => prev.map((u) => (u.uid === userItem.uid ? { ...u, status: nextStatus } : u)));
      setAccounts((prev) =>
        prev.map((a) => (a.ownerUid === userItem.uid ? { ...a, status: nextStatus } : a))
      );
      triggerToast(`Account status updated to ${nextStatus} for ${userItem.name}.`);
    } catch (err: any) {
      triggerToast(`Error updating status: ${err.message}`);
    }
  };

  // Soft Delete (Close Account)
  const handleConfirmDelete = async () => {
    if (!deleteWarningUser) return;
    try {
      await updateCustomerStatus(deleteWarningUser.uid, 'closed');
      setUsers((prev) =>
        prev.map((u) => (u.uid === deleteWarningUser.uid ? { ...u, status: 'closed' } : u))
      );
      setAccounts((prev) =>
        prev.map((a) => (a.ownerUid === deleteWarningUser.uid ? { ...a, status: 'closed' } : a))
      );
      setDeleteWarningUser(null);
      triggerToast(`Account permanently closed for ${deleteWarningUser.name}.`);
    } catch (err: any) {
      triggerToast(`Error closing account: ${err.message}`);
    }
  };

  // Reset Customer Transfer PIN
  const handleResetCustomerPin = async (customer: UserProfile) => {
    try {
      if (isFirebaseConfigured() && db) {
        await deleteDoc(doc(db, 'pins', customer.uid));
        await updateDoc(doc(db, 'users', customer.uid), { hasPin: false });
      } else if (isMockEnabled) {
        mockStorage.deletePin(customer.uid);
      }
      setUsers((prev) =>
        prev.map((u) => (u.uid === customer.uid ? { ...u, hasPin: false } : u))
      );
      triggerToast(`Transfer PIN reset for ${customer.name}.`);
    } catch (err: any) {
      console.error('Failed to reset customer PIN:', err);
      triggerToast(`Error resetting PIN: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Toast */}
      {feedbackToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-on-tertiary-fixed text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Info className="w-4 h-4 text-primary-container" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Customer Directory</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage account permissions, ledger adjustments, and customer statuses
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold self-start sm:self-auto">
          {filteredUsers.length} Customer Record{filteredUsers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search & Status Filter Chips */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, email, or account #..."
            className="w-full h-11 pl-10 pr-4 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
          />
        </div>

        {/* Filter Chips (All / Active / Disabled / Closed) */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'active'
                ? 'bg-surface-container-lowest text-emerald-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('disabled')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'disabled'
                ? 'bg-surface-container-lowest text-amber-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Disabled
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'closed'
                ? 'bg-surface-container-lowest text-rose-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Closed
          </button>
        </div>
      </div>

      {/* Customer Cards List */}
      <div className="space-y-4">
        {isLoading ? (
          <TableRowSkeleton count={4} />
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((customer) => {
            const customerAccount = accounts.find((a) => a.ownerUid === customer.uid);
            return (
              <div
                key={customer.uid}
                className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs hover:shadow-md transition-all flex flex-col gap-4"
              >
                {/* Header row with avatar, name, and status toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                      {customer.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-on-surface truncate">{customer.name}</h3>
                        <UserStatusBadge status={customer.status} />
                        {customer.hasPin ? (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                            PIN Set
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px]">
                            No PIN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant font-mono truncate">
                        @{customer.username} • {customer.email}
                      </p>
                    </div>
                  </div>

                  {/* Status Action Switch */}
                  {customer.status !== 'closed' && (
                    <button
                      onClick={() => handleToggleStatus(customer)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        customer.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-800 hover:bg-amber-500/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{customer.status === 'active' ? 'Disable Account' : 'Enable Account'}</span>
                    </button>
                  )}
                </div>

                {/* Account Details & Balance Strip */}
                <div className="p-3.5 bg-surface-container-low rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] text-on-surface-variant block font-medium">Primary Account</span>
                    <span className="text-sm font-bold text-on-surface">
                      Community {customerAccount?.type || 'Checking'}
                    </span>
                    <span className="text-xs font-mono text-secondary-fixed-variant block">
                      Account: {customerAccount?.accountNumber || 'Pending'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-on-surface-variant block font-medium">Ledger Balance</span>
                    <span className="text-lg font-bold text-on-surface font-ledger-numerical">
                      {customerAccount ? formatCentsToUSD(customerAccount.balanceCents) : '$0.00'}
                    </span>
                  </div>
                </div>

                {/* Actions Grid (Edit Balance, Enable/Disable, Reset Transfer PIN, Reset PW, Delete) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-outline-variant/20 text-xs">
                  {/* 1. Edit Balance */}
                  <button
                    onClick={() => openBalanceModal(customer)}
                    disabled={customer.status !== 'active'}
                    className="h-10 rounded-xl bg-primary-container/20 text-on-primary-container hover:bg-primary-container/30 font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Edit Balance</span>
                  </button>

                  {/* 2. Enable / Disable */}
                  <button
                    onClick={() => handleToggleStatus(customer)}
                    disabled={customer.status === 'closed'}
                    className="h-10 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    {customer.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    <span>{customer.status === 'active' ? 'Disable' : 'Enable'}</span>
                  </button>

                  {/* 3. Reset Transfer PIN */}
                  <button
                    type="button"
                    onClick={() => handleResetCustomerPin(customer)}
                    disabled={!customer.hasPin || customer.status === 'closed'}
                    className="h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                    title={customer.hasPin ? 'Reset customer 4-digit transfer PIN' : 'Customer has not configured a transfer PIN'}
                  >
                    <RotateCcw className="w-4 h-4 text-primary" />
                    <span>Reset PIN</span>
                  </button>

                  {/* 4. Reset PW (Strictly per instruction: "Reset PW shown as disabled with 'Needs Cloud Functions'. The client SDK can't reset another user's password.") */}
                  <div className="relative group">
                    <button
                      type="button"
                      disabled
                      className="w-full h-10 rounded-xl bg-surface-container text-on-surface-variant/60 font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
                      title="Needs Cloud Functions. The client SDK cannot reset another user's password."
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Reset PW</span>
                    </button>
                    <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-48 p-2 bg-on-secondary-fixed text-white text-[10px] rounded-lg shadow-lg text-center z-20 pointer-events-none">
                      Needs Cloud Functions. The client SDK cannot reset another user&apos;s password.
                    </div>
                  </div>

                  {/* 5. Delete (Soft delete, status "closed") */}
                  <button
                    onClick={() => setDeleteWarningUser(customer)}
                    disabled={customer.status === 'closed'}
                    className="h-10 rounded-xl bg-error-container/20 text-error hover:bg-error-container/40 font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{customer.status === 'closed' ? 'Closed' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-surface-container-lowest p-12 rounded-2xl text-center border border-outline-variant/30">
            <Users className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
            <h4 className="text-sm font-bold text-on-surface">No customers match your search</h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Try modifying your search or filter keywords above.
            </p>
          </div>
        )}
      </div>

      {/* ================= EDIT BALANCE DIALOG ================= */}
      {isBalanceModalOpen && targetAccount && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-container via-tertiary to-primary" />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Adjust Customer Balance</h3>
                  <span className="text-xs text-on-surface-variant font-mono">
                    {targetUser.name} ({targetAccount.accountNumber})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsBalanceModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                ✕
              </button>
            </div>

            {/* Error notice */}
            {adjustmentError && (
              <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-error shrink-0" />
                <span>{adjustmentError}</span>
              </div>
            )}

            {/* Current Balance */}
            <div className="p-3.5 bg-surface-container rounded-xl flex items-center justify-between text-xs">
              <span className="text-on-surface-variant font-medium">Current Balance:</span>
              <span className="font-bold text-sm text-on-surface font-ledger-numerical">
                {formatCentsToUSD(targetAccount.balanceCents)} USD
              </span>
            </div>

            <form onSubmit={handleConfirmBalance} className="space-y-4">
              {/* Add / Deduct Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface">Adjustment Direction *</label>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container gap-1">
                  <button
                    type="button"
                    onClick={() => setAdjustmentDirection('add')}
                    className={`h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      adjustmentDirection === 'add'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span>+ Add Funds</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentDirection('deduct')}
                    className={`h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      adjustmentDirection === 'deduct'
                        ? 'bg-surface-container-lowest text-error shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4 text-rose-600" />
                    <span>- Deduct Funds</span>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="adjAmount">
                  Adjustment Amount (USD) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-base font-bold text-on-surface-variant">$</span>
                  <input
                    id="adjAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={adjustmentAmountStr}
                    onChange={(e) => setAdjustmentAmountStr(e.target.value)}
                    required
                    className="w-full h-11 pl-8 pr-16 bg-surface-container-low rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                  <span className="absolute right-3.5 text-xs font-bold text-on-surface-variant">USD</span>
                </div>
              </div>

              {/* Required Audit Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="adjNote">
                  Required Ledger Note / Reason *
                </label>
                <input
                  id="adjNote"
                  type="text"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="e.g. Courtesy fee refund or account correction"
                  required
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-xs text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                />
              </div>

              {/* Projected Balance Live Preview */}
              <div className="p-3.5 bg-primary-container/15 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-on-primary-container">Projected New Balance:</span>
                <span className="font-bold text-base text-primary font-ledger-numerical">
                  {formatCentsToUSD(projectedBalanceCents)} USD
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingAdjustment ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Adjustment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE (SOFT DELETE / CLOSE) CONFIRMATION MODAL ================= */}
      {deleteWarningUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-on-surface">Close Customer Account?</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                You are about to soft-delete / close the account for{' '}
                <strong className="text-on-surface">{deleteWarningUser.name}</strong> (@{deleteWarningUser.username}).
              </p>
            </div>

            <p className="text-xs text-on-surface-variant/80 bg-surface-container p-3 rounded-xl text-left">
              Closing this account marks its status as <strong className="text-error">closed</strong>. The user will be blocked from logging in, and transfers to or from their account will be rejected. Ledger history remains preserved for auditing.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteWarningUser(null)}
                className="h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="h-11 rounded-xl bg-error hover:bg-error/90 text-on-error font-bold text-xs shadow-xs"
              >
                Confirm Close Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
