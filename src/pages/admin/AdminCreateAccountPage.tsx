import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isFirebaseConfigured, getSecondaryAuth, db } from '../../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { mockStorage } from '../../services/mockStorage';
import { deriveAuthEmail, ROUTING_NUMBER } from '../../config/brand';
import { generateAccountNumber, parseUSDToCents, formatCentsToUSD } from '../../utils/format';
import { UserProfile, BankAccount, AccountDirectoryEntry, TransactionRecord, AccountType } from '../../types';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building,
  Check,
  CreditCard,
  PiggyBank,
  ArrowRight,
} from 'lucide-react';

export const AdminCreateAccountPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('Checking');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('500.00');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    accountNumber: string;
    username: string;
    name: string;
    balanceCents: number;
    accountType: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!name.trim()) {
      setError('Please provide customer full legal name.');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid customer contact email.');
      return;
    }
    if (!dob) {
      setError('Date of birth is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const openingCents = parseUSDToCents(openingBalanceStr);
    if (openingCents < 0) {
      setError('Opening balance cannot be negative.');
      return;
    }

    setIsSubmitting(true);

    if (isFirebaseConfigured() && db) {
      const secondarySetup = getSecondaryAuth();
      if (!secondarySetup) {
        setError('Unable to initialize isolated secondary auth instance.');
        setIsSubmitting(false);
        return;
      }

      const { secondaryAuth, cleanup } = secondarySetup;
      const derivedEmail = deriveAuthEmail(cleanUsername);

      try {
        // 1. Create user in the secondary Firebase Auth instance without signing admin out!
        const cred = await createUserWithEmailAndPassword(secondaryAuth, derivedEmail, password);
        const newUid = cred.user.uid;

        // Clean up / sign out from secondary auth immediately
        await cleanup();

        // 2. Write the Firestore documents using the primary admin instance
        const newAccountNumber = generateAccountNumber();
        const accountId = `acct_${newUid}`;

        const userDoc: UserProfile = {
          uid: newUid,
          name: name.trim(),
          username: cleanUsername,
          email: email.trim(),
          dob,
          phone: '(555) 010-0000',
          address: { street: '120 Financial Plaza', city: 'Chicago', state: 'IL', zip: '60601' },
          role: 'customer',
          status: 'active',
          createdAt: serverTimestamp(),
        };

        const accountDoc: BankAccount = {
          id: accountId,
          ownerUid: newUid,
          accountNumber: newAccountNumber,
          type: accountType,
          balanceCents: openingCents,
          status: 'active',
          createdAt: serverTimestamp(),
        };

        const directoryDoc: AccountDirectoryEntry = {
          accountNumber: newAccountNumber,
          accountId,
          ownerName: userDoc.name,
          status: 'active',
        };

        await setDoc(doc(db, 'users', newUid), userDoc);
        await setDoc(doc(db, 'accounts', accountId), accountDoc);
        await setDoc(doc(db, 'accountDirectory', newAccountNumber), directoryDoc);

        // Record opening deposit transaction if opening balance > 0
        if (openingCents > 0) {
          const txRef = doc(collection(db, 'transactions'));
          const txDoc: Omit<TransactionRecord, 'id'> = {
            accountId,
            ownerUid: newUid,
            type: 'credit',
            amountCents: openingCents,
            counterpartyName: 'Institutional Opening Deposit',
            counterpartyAccount: 'LEDGER-START',
            note: 'Initial account opening funding',
            balanceAfterCents: openingCents,
            status: 'cleared',
            createdAt: serverTimestamp(),
          };
          await setDoc(txRef, txDoc);
        }

        setSuccessResult({
          accountNumber: newAccountNumber,
          username: cleanUsername,
          name: userDoc.name,
          balanceCents: openingCents,
          accountType,
        });
      } catch (err: any) {
        let msg = err.message || 'Error creating customer account.';
        if (err.code === 'auth/email-already-in-use') {
          msg = 'This username is already taken. Please choose another username.';
        }
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Mock mode
      try {
        await new Promise((res) => setTimeout(res, 400));
        const { account, user: createdUser } = mockStorage.adminCreateUser({
          name: name.trim(),
          username: cleanUsername,
          email: email.trim(),
          dob,
          accountType,
          openingBalanceCents: openingCents,
        });

        setSuccessResult({
          accountNumber: account.accountNumber,
          username: cleanUsername,
          name: createdUser.name,
          balanceCents: openingCents,
          accountType,
        });
      } catch (err: any) {
        setError(err.message || 'Error creating mock user.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResetForm = () => {
    setName('');
    setUsername('');
    setEmail('');
    setDob('');
    setPassword('Password123!');
    setOpeningBalanceStr('500.00');
    setSuccessResult(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Provision Customer Account</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Create verified customer credentials, configure account type, and deposit opening funds.
        </p>
      </div>

      {/* Error notice */}
      {error && (
        <div className="p-3.5 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 text-error shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success View */}
      {successResult ? (
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-outline-variant/30 shadow-md flex flex-col gap-5 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>

          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
              Account Provisioned
            </span>
            <h3 className="text-xl font-bold text-on-surface mt-1">Customer Successfully Created</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Admin session remained active. All ledger records and directory entries are synced.
            </p>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Customer Name:</span>
              <span className="font-bold text-on-surface">{successResult.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Username / Member ID:</span>
              <span className="font-mono font-bold text-primary">@{successResult.username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Account Number:</span>
              <span className="font-mono font-bold text-on-surface">{successResult.accountNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Account Type:</span>
              <span className="font-semibold text-on-surface">Community {successResult.accountType}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
              <span className="text-on-surface-variant font-semibold">Opening Balance:</span>
              <span className="font-bold text-base text-emerald-600 font-ledger-numerical">
                {formatCentsToUSD(successResult.balanceCents)} USD
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs"
            >
              + Create Another
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/customers')}
              className="h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-bold text-xs shadow-xs"
            >
              View in Directory
            </button>
          </div>
        </div>
      ) : (
        /* Create Account Form */
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-5"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/20">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-on-surface">Customer Profile Details</h2>
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface" htmlFor="custName">
                Full Legal Name *
              </label>
              <input
                id="custName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. David Kim"
                required
                className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
              />
            </div>

            {/* Username & Contact Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="custUsername">
                  Username (Member ID) *
                </label>
                <input
                  id="custUsername"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="e.g. david.kim"
                  required
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 lowercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="custEmail">
                  Contact Email *
                </label>
                <input
                  id="custEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="david@workplace.co"
                  required
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                />
              </div>
            </div>

            {/* Date of Birth & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="custDob">
                  Date of Birth *
                </label>
                <input
                  id="custDob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="custPwd">
                  Initial Password *
                </label>
                <div className="relative flex items-center">
                  <input
                    id="custPwd"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 pl-3.5 pr-10 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Account Type Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-on-surface">Account Product Type *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('Checking')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    accountType === 'Checking'
                      ? 'border-primary-container bg-primary-container/10 ring-2 ring-primary-container/20'
                      : 'border-outline-variant/30 bg-surface-container-low'
                  }`}
                >
                  <span className="font-bold text-xs text-on-surface block">Community Checking</span>
                  <span className="text-[11px] text-primary block mt-0.5">$0 Fee • Debit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('Savings')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    accountType === 'Savings'
                      ? 'border-primary-container bg-primary-container/10 ring-2 ring-primary-container/20'
                      : 'border-outline-variant/30 bg-surface-container-low'
                  }`}
                >
                  <span className="font-bold text-xs text-on-surface block">High-Yield Savings</span>
                  <span className="text-[11px] text-tertiary block mt-0.5">4.25% APY</span>
                </button>
              </div>
            </div>

            {/* Opening Balance */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface" htmlFor="openBal">
                Opening Balance Funding (USD)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-base font-bold text-on-surface-variant">$</span>
                <input
                  id="openBal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingBalanceStr}
                  onChange={(e) => setOpeningBalanceStr(e.target.value)}
                  className="w-full h-11 pl-8 pr-14 bg-surface-container-low rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                />
                <span className="absolute right-3 text-xs font-bold text-on-surface-variant">USD</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/customers')}
              className="h-11 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 bg-primary-container hover:bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
