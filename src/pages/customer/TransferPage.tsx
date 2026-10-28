import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerAccount,
  lookupAccountDirectory,
  executeTransferTransaction,
  verifyTransferPin,
} from '../../services/banking';
import { BankAccount, AccountDirectoryEntry } from '../../types';
import { formatCentsToUSD, maskAccountNumber, parseUSDToCents } from '../../utils/format';
import { isWeakPin } from '../../utils/pin';
import { useDraftState } from '../../hooks/useDraftState';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getFriendlyError, withTimeout, triggerOfflineShake } from '../../utils/errorMessages';
import { ErrorState } from '../../components/common/ErrorState';
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  Check,
  Zap,
  X,
  HelpCircle,
  Fingerprint,
  ScanFace,
} from 'lucide-react';
import {
  getBiometricConfig,
  isHighValueTransfer,
  isPlatformAuthenticatorAvailable,
  DEFAULT_BIOMETRIC_THRESHOLD_CENTS,
  BiometricConfig,
} from '../../services/biometrics';
import { BiometricPromptModal } from '../../components/common/BiometricPromptModal';

export const TransferPage: React.FC = () => {
  const { user, setTransferPin, resetTransferPinWithPassword } = useAuth();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [accountLoadError, setAccountLoadError] = useState<{ title: string; message: string } | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  // Draft persistence for form inputs (debounced 300ms, 24h TTL, cleared on transfer success)
  const [recipientAccountNum, setRecipientAccountNum, clearRecipient] = useDraftState(
    user?.uid,
    'transfer_recipient',
    ''
  );
  const [amountStr, setAmountStr, clearAmount] = useDraftState(user?.uid, 'transfer_amount', '');
  const [note, setNote, clearMemo] = useDraftState(user?.uid, 'transfer_note', '');

  const [verifiedRecipient, setVerifiedRecipient] = useState<AccountDirectoryEntry | null>(null);
  const [isVerifyingRecipient, setIsVerifyingRecipient] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // PIN modal & Authorization state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [pinError, setPinError] = useState<string | null>(null);
  const [transferErrorCode, setTransferErrorCode] = useState<string | null>(null);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Lockout state (3 attempts -> 15 min client-side lockout)
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(0);

  // Initial PIN setup modal for users with hasPin === false
  const [isSetupPinModalOpen, setIsSetupPinModalOpen] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [setupConfirmPin, setSetupConfirmPin] = useState('');
  const [setupPinError, setSetupPinError] = useState<string | null>(null);
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Forgot PIN reset modal
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetPinError, setResetPinError] = useState<string | null>(null);
  const [isResettingPin, setIsResettingPin] = useState(false);

  // Success Modal State
  const [successData, setSuccessData] = useState<{
    newBalanceCents: number;
    amountCents: number;
    recipientName: string;
    accountNumber: string;
  } | null>(null);

  // Biometric authentication state for high-value transactions
  const [biometricConfig, setBiometricConfig] = useState<BiometricConfig>(() =>
    user ? getBiometricConfig(user.uid) : { enabled: false, thresholdCents: DEFAULT_BIOMETRIC_THRESHOLD_CENTS }
  );
  const [isPlatformAuthAvailable, setIsPlatformAuthAvailable] = useState<boolean>(true);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setIsPlatformAuthAvailable);
    if (user) {
      setBiometricConfig(getBiometricConfig(user.uid));
    }
    const handleBioUpdate = (e: any) => {
      if (user && e.detail?.uid === user.uid) {
        setBiometricConfig(e.detail.config);
      }
    };
    window.addEventListener('emprise_biometrics_updated', handleBioUpdate);
    return () => window.removeEventListener('emprise_biometrics_updated', handleBioUpdate);
  }, [user]);

  // Reset biometric verification if amount changes
  useEffect(() => {
    setIsBiometricVerified(false);
  }, [amountStr]);

  // Load Customer Account
  const loadAccount = async () => {
    if (!user) return;
    setIsLoadingAccount(true);
    setAccountLoadError(null);
    try {
      const acct = await withTimeout(getCustomerAccount(user.uid), 10000);
      setAccount(acct);
    } catch (err) {
      setAccountLoadError(getFriendlyError(err));
    } finally {
      setIsLoadingAccount(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, [user]);

  // Lockout timer ticker
  useEffect(() => {
    if (!user) return;
    const checkLockout = () => {
      try {
        const raw = localStorage.getItem(`emprise:pinfail:${user.uid}`);
        if (!raw) {
          setLockoutRemainingSec(0);
          return;
        }
        const data = JSON.parse(raw);
        if (data.lockedUntil && data.lockedUntil > Date.now()) {
          const diff = Math.ceil((data.lockedUntil - Date.now()) / 1000);
          setLockoutRemainingSec(diff);
        } else {
          setLockoutRemainingSec(0);
        }
      } catch {
        setLockoutRemainingSec(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Live Recipient Lookup when 10 digits entered
  useEffect(() => {
    const clean = recipientAccountNum.trim();
    setLookupError(null);

    if (clean.length === 10) {
      if (account && account.accountNumber === clean) {
        setLookupError('Self-transfer is not permitted.');
        setVerifiedRecipient(null);
        return;
      }

      setIsVerifyingRecipient(true);
      const timer = setTimeout(async () => {
        const found = await lookupAccountDirectory(clean);
        setIsVerifyingRecipient(false);
        if (found) {
          if (found.status !== 'active') {
            setLookupError(`Recipient account is ${found.status}. Transfers unavailable.`);
            setVerifiedRecipient(null);
          } else {
            setVerifiedRecipient(found);
            setLookupError(null);
          }
        } else {
          setLookupError('Account not found in directory.');
          setVerifiedRecipient(null);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setVerifiedRecipient(null);
    }
  }, [recipientAccountNum, account]);

  const handleQuickAdd = (increment: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + increment).toFixed(2));
  };

  // Step 1: Validate form and open PIN modal
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setTransferErrorCode(null);

    if (!account || !user) {
      setTransferError('Account details not ready.');
      return;
    }

    if (!user.hasPin) {
      setIsSetupPinModalOpen(true);
      return;
    }

    const cents = parseUSDToCents(amountStr);
    if (cents <= 0) {
      setTransferError('Transfer amount must be greater than $0.00.');
      return;
    }

    if (account.balanceCents < cents) {
      setTransferError(
        `Insufficient funds. Your available balance is ${formatCentsToUSD(account.balanceCents)}.`
      );
      return;
    }

    if (!recipientAccountNum.trim() || recipientAccountNum.trim().length !== 10) {
      setTransferError('Please enter a valid 10-digit recipient account number.');
      return;
    }

    if (!verifiedRecipient) {
      setTransferError('Please verify a valid active recipient account first.');
      return;
    }

    const isHighValue = isHighValueTransfer(cents, biometricConfig.thresholdCents);

    // If high-value transfer and not yet verified via biometrics on a supporting device, request biometric auth
    if (isHighValue && !isBiometricVerified && isPlatformAuthAvailable) {
      setIsBiometricModalOpen(true);
      return;
    }

    // Open PIN prompt modal
    setPinDigits(['', '', '', '']);
    setPinError(null);
    setTransferErrorCode(null);
    setIsPinModalOpen(true);
    setTimeout(() => {
      pinInputRefs.current[0]?.focus();
    }, 100);
  };

  const handleBiometricSuccess = () => {
    setIsBiometricVerified(true);
    setIsBiometricModalOpen(false);
    // Proceed directly to PIN confirmation
    setPinDigits(['', '', '', '']);
    setPinError(null);
    setTransferErrorCode(null);
    setIsPinModalOpen(true);
    setTimeout(() => {
      pinInputRefs.current[0]?.focus();
    }, 100);
  };

  const handleBiometricFallback = () => {
    setIsBiometricModalOpen(false);
    // User chooses PIN fallback
    setPinDigits(['', '', '', '']);
    setPinError(null);
    setTransferErrorCode(null);
    setIsPinModalOpen(true);
    setTimeout(() => {
      pinInputRefs.current[0]?.focus();
    }, 100);
  };

  // Step 2: Auto-advancing 4-digit PIN box handling
  const handlePinDigitChange = (index: number, val: string) => {
    setPinError(null);
    setTransferErrorCode(null);
    const cleaned = val.replace(/\D/g, '');
    const newDigits = [...pinDigits];

    if (cleaned.length > 1) {
      // Handle paste
      const chars = cleaned.slice(0, 4).split('');
      chars.forEach((c, idx) => {
        newDigits[idx] = c;
      });
      setPinDigits(newDigits);
      if (chars.length === 4) {
        handleExecuteTransfer(chars.join(''));
      } else {
        pinInputRefs.current[Math.min(chars.length, 3)]?.focus();
      }
      return;
    }

    newDigits[index] = cleaned;
    setPinDigits(newDigits);

    if (cleaned && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }

    // If 4 digits entered, auto-submit
    if (cleaned && index === 3 && newDigits.every((d) => d.length === 1)) {
      handleExecuteTransfer(newDigits.join(''));
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 3: Execute transfer with 4-digit PIN
  const handleExecuteTransfer = async (pinCode: string) => {
    if (!account || !user || !verifiedRecipient) return;

    if (lockoutRemainingSec > 0) {
      setPinError(`Account locked due to consecutive wrong attempts. Try again in ${formatLockoutTime(lockoutRemainingSec)}.`);
      return;
    }

    if (pinCode.length !== 4) {
      setPinError('Please enter all 4 digits of your transfer PIN.');
      return;
    }

    const cents = parseUSDToCents(amountStr);
    setIsSubmitting(true);
    setPinError(null);
    setTransferErrorCode(null);

    try {
      // 1. Call verifyTransferPin FIRST
      await verifyTransferPin(pinCode, user.uid);

      // 2. Only if it succeeds, call executeTransferTransaction
      const result = await executeTransferTransaction({
        senderAccountId: account.id,
        senderUid: user.uid,
        recipientAccountNumber: recipientAccountNum.trim(),
        amountCents: cents,
        note: note.trim(),
        pin: pinCode,
      });

      // Clear wrong attempt tracking on success
      try {
        localStorage.removeItem(`emprise:pinfail:${user.uid}`);
      } catch {}

      // Update local state
      setAccount({ ...account, balanceCents: result.senderNewBalanceCents });
      setSuccessData({
        newBalanceCents: result.senderNewBalanceCents,
        amountCents: cents,
        recipientName: result.recipientName,
        accountNumber: recipientAccountNum.trim(),
      });

      // Clear draft persistence
      clearRecipient();
      clearAmount();
      clearMemo();
      setVerifiedRecipient(null);
      setIsBiometricVerified(false);
      setIsPinModalOpen(false);
    } catch (err: any) {
      const code = err?.code || 'UNKNOWN';
      const message = err?.message || 'Something went wrong.';

      // Diagnostics: on any transfer failure
      console.error('[transfer]', code, message);
      setTransferErrorCode(code);

      if (code === 'WRONG_PIN') {
        try {
          const raw = localStorage.getItem(`emprise:pinfail:${user.uid}`);
          const data = raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
          const newCount = (data.count || 0) + 1;
          if (newCount >= 3) {
            const lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
            localStorage.setItem(
              `emprise:pinfail:${user.uid}`,
              JSON.stringify({ count: newCount, lockedUntil })
            );
            setLockoutRemainingSec(15 * 60);
            setPinError('Too many failed PIN attempts. Locked for 15 minutes.');
          } else {
            localStorage.setItem(
              `emprise:pinfail:${user.uid}`,
              JSON.stringify({ count: newCount, lockedUntil: 0 })
            );
            setPinError(`Incorrect PIN. ${3 - newCount} attempt(s) remaining before 15-minute lockout.`);
          }
        } catch {
          setPinError('Incorrect PIN. 2 attempt(s) remaining before 15-minute lockout.');
        }
        setPinDigits(['', '', '', '']);
        pinInputRefs.current[0]?.focus();
      } else if (code === 'NETWORK') {
        setPinError('Network problem. Check your network connection and try again.');
      } else if (code === 'TRANSFER_PERMISSION') {
        setPinError('Transfer could not be completed. Please try again or contact support.');
      } else {
        const friendly = getFriendlyError(err);
        setPinError(friendly.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for formatting mm:ss
  const formatLockoutTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Handle Set Transfer PIN submission
  const handleSaveInitialPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupPinError(null);

    if (setupPin.length !== 4 || !/^\d{4}$/.test(setupPin)) {
      setSetupPinError('PIN must be exactly 4 numeric digits.');
      return;
    }
    if (isWeakPin(setupPin)) {
      setSetupPinError('PIN is too simple. Avoid repeated digits (like 1111) or sequences (like 1234).');
      return;
    }
    if (setupPin !== setupConfirmPin) {
      setSetupPinError('PIN confirmation does not match.');
      return;
    }

    setIsSavingPin(true);
    const res = await setTransferPin(setupPin);
    setIsSavingPin(false);

    if (res.success) {
      setIsSetupPinModalOpen(false);
      setSetupPin('');
      setSetupConfirmPin('');
    } else {
      setSetupPinError(res.error || 'Failed to configure transfer PIN.');
    }
  };

  // Handle Forgot PIN reset
  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPinError(null);

    if (!resetPassword) {
      setResetPinError('Please enter your account password.');
      return;
    }
    if (resetNewPin.length !== 4 || !/^\d{4}$/.test(resetNewPin)) {
      setResetPinError('New PIN must be 4 digits.');
      return;
    }
    if (isWeakPin(resetNewPin)) {
      setResetPinError('New PIN is too simple. Avoid repeated digits or straight sequences.');
      return;
    }
    if (resetNewPin !== resetConfirmPin) {
      setResetPinError('New PIN confirmation does not match.');
      return;
    }

    setIsResettingPin(true);
    const res = await resetTransferPinWithPassword(resetPassword, resetNewPin);
    setIsResettingPin(false);

    if (res.success) {
      setIsResetPinModalOpen(false);
      setResetPassword('');
      setResetNewPin('');
      setResetConfirmPin('');
      setLockoutRemainingSec(0);
      setPinError(null);
    } else {
      setResetPinError(res.error || 'Password verification failed.');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full animate-fade-in pb-16">
      {/* Title & Context */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Transfer Money</h1>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Instant</span>
          </span>
        </div>
        <p className="text-xs text-on-surface-variant">Send funds securely to any verified member account</p>
      </div>

      {/* Account Load Error */}
      {accountLoadError && !account && (
        <ErrorState
          title={accountLoadError.title}
          message={accountLoadError.message}
          onRetry={loadAccount}
        />
      )}

      {/* From-Account Source Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs flex flex-col gap-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary-container/40 flex items-center justify-center text-tertiary">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              From Account
            </span>
          </div>
          <span className="text-xs font-semibold text-primary">Active</span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold text-on-surface truncate">
              Community {account?.type || 'Checking'}
            </span>
            <span className="text-xs text-on-surface-variant font-mono">
              {account ? maskAccountNumber(account.accountNumber) : '•••• ----'}
            </span>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="text-xl font-bold text-on-surface font-ledger-numerical">
              {account ? formatCentsToUSD(account.balanceCents) : '$0.00'}
            </span>
            <span className="text-[11px] text-outline">Available to send</span>
          </div>
        </div>
      </div>

      {/* PIN Setup Prompt Card if user hasPin === false */}
      {user && !user.hasPin && (
        <div className="p-4 bg-primary-container/15 border border-primary/20 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-on-surface truncate">Create your 4-digit Transfer PIN</h4>
              <p className="text-[11px] text-on-surface-variant">
                A security PIN is required to authorize all outgoing transfers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSetupPinModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shrink-0 shadow-xs"
          >
            Set PIN
          </button>
        </div>
      )}

      {/* Form Error Banner */}
      {transferError && (
        <div className="flex flex-col gap-1.5 animate-shake">
          <div className="p-3.5 bg-error-container text-on-error-container rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{transferError}</div>
          </div>
          {transferErrorCode && (
            <details className="text-[11px] text-on-surface-variant/80 px-1 cursor-pointer">
              <summary className="hover:underline">Technical details</summary>
              <div className="mt-1 font-mono text-[10px] text-on-surface-variant">
                {transferErrorCode}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Main Transfer Form Card */}
      <form
        onSubmit={handleInitiateSend}
        className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-5"
      >
        {/* Recipient Account Number Field with live lookup */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-on-surface" htmlFor="recipientAccount">
              Recipient 10-Digit Account Number *
            </label>
            {isVerifyingRecipient && (
              <span className="text-[11px] text-primary animate-pulse flex items-center gap-1">
                <span>Looking up recipient...</span>
              </span>
            )}
          </div>

          <div className="relative flex items-center">
            <input
              id="recipientAccount"
              type="text"
              maxLength={10}
              value={recipientAccountNum}
              onChange={(e) => setRecipientAccountNum(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 10-digit account number"
              required
              className="w-full h-12 px-3.5 bg-surface-container-low rounded-xl text-base font-mono text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 tracking-wider"
            />
          </div>

          {/* Verified Recipient Banner */}
          {verifiedRecipient && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between animate-fade-in mt-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">
                    Verified: {verifiedRecipient.ownerName}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-mono">
                    Account: {verifiedRecipient.accountNumber}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                Ready
              </span>
            </div>
          )}

          {/* Lookup Error Message */}
          {lookupError && (
            <p className="text-[11px] font-semibold text-error mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{lookupError}</span>
            </p>
          )}
        </div>

        {/* Amount Input */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-semibold text-on-surface" htmlFor="amount">
            Transfer Amount (USD) *
          </label>

          <div className="bg-surface-container-low p-4 rounded-2xl flex flex-col items-center justify-center border border-outline-variant/30">
            <div className="flex items-center justify-center text-3xl sm:text-4xl font-bold font-ledger-numerical text-on-surface">
              <span className="text-outline-variant mr-1">$</span>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                required
                className="bg-transparent text-center w-48 focus:outline-none font-bold"
              />
            </div>
            <span className="text-[11px] text-on-surface-variant mt-1">Network Fee: $0.00 • Instant Clearing</span>
          </div>

          {/* Quick-Add Chips */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleQuickAdd(50)}
              className="h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors"
            >
              +$50
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(100)}
              className="h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors"
            >
              +$100
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(250)}
              className="h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors"
            >
              +$250
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(500)}
              className="h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors"
            >
              +$500
            </button>
          </div>
        </div>

        {/* Note / Memo Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-on-surface" htmlFor="memo">
            Transfer Memo / Note
          </label>
          <input
            id="memo"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Dinner reimbursement or invoice payment"
            className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
          />
        </div>

        {/* High-Value Transaction Biometric Notice */}
        {isHighValueTransfer(parseUSDToCents(amountStr), biometricConfig.thresholdCents) && parseUSDToCents(amountStr) > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950">High-Value Security Protocol Active</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 font-bold text-[10px]">
                  Threshold: {formatCentsToUSD(biometricConfig.thresholdCents || DEFAULT_BIOMETRIC_THRESHOLD_CENTS)}
                </span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                {isBiometricVerified ? (
                  <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Biometric identity confirmed via WebAuthn. Ready for authorization.
                  </span>
                ) : (
                  'Transfers of this amount require biometric authentication (Touch ID, Face ID, or Windows Hello) before execution to prevent unauthorized account takeover.'
                )}
              </p>
            </div>
          </div>
        )}

        {/* Send Action Button */}
        <div
          onClick={() => {
            if (!isOnline) triggerOfflineShake();
          }}
          className="w-full"
        >
          <button
            type="submit"
            disabled={isSubmitting || !verifiedRecipient || !isOnline}
            className="h-12 w-full mt-2 bg-primary-container hover:bg-primary text-on-primary font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Send Money Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {!isOnline && (
          <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center font-medium">
            Connect to the internet to send money.
          </p>
        )}
      </form>

      {/* ================= 4-DIGIT PIN BOTTOM-SHEET / MODAL ================= */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col gap-5 border border-outline-variant/30 animate-slide-up sm:animate-none">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Authorize Transfer</h3>
                  <p className="text-[11px] text-on-surface-variant">Enter your 4-digit transfer PIN</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transfer Summary Pill */}
            <div className="p-3.5 bg-surface-container-low rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-on-surface-variant block text-[11px]">Sending to:</span>
                <span className="font-bold text-on-surface">{verifiedRecipient?.ownerName}</span>
              </div>
              <div className="text-right">
                <span className="text-on-surface-variant block text-[11px]">Amount:</span>
                <span className="font-bold text-sm text-primary font-ledger-numerical">
                  {formatCentsToUSD(parseUSDToCents(amountStr))}
                </span>
              </div>
            </div>

            {/* Biometric verification status banner */}
            {isBiometricVerified ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Biometric Identity Verified via WebAuthn</span>
                </div>
                <Fingerprint className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
            ) : isHighValueTransfer(parseUSDToCents(amountStr), biometricConfig.thresholdCents) ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="truncate">High-Value Transfer: 4-digit PIN confirmation</span>
                </div>
                {isPlatformAuthAvailable && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPinModalOpen(false);
                      setIsBiometricModalOpen(true);
                    }}
                    className="text-[11px] text-primary underline font-bold cursor-pointer hover:text-primary/80 shrink-0"
                  >
                    Use Biometrics
                  </button>
                )}
              </div>
            ) : null}

            {/* Error / Lockout notice */}
            {pinError && (
              <div className="flex flex-col gap-1.5 animate-shake">
                <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-error shrink-0" />
                  <span>{pinError}</span>
                </div>
                {transferErrorCode && (
                  <details className="text-[11px] text-on-surface-variant/80 px-1 cursor-pointer">
                    <summary className="hover:underline">Technical details</summary>
                    <div className="mt-1 font-mono text-[10px] text-on-surface-variant">
                      {transferErrorCode}
                    </div>
                  </details>
                )}
              </div>
            )}

            {lockoutRemainingSec > 0 && (
              <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center justify-between animate-fade-in">
                <span>Security Lockout Active:</span>
                <span className="font-mono font-bold">{formatLockoutTime(lockoutRemainingSec)}</span>
              </div>
            )}

            {/* 4 Masked Auto-Advancing Digit Boxes */}
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    pinInputRefs.current[idx] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={idx === 0 ? 4 : 1}
                  disabled={lockoutRemainingSec > 0 || isSubmitting}
                  value={pinDigits[idx]}
                  onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  autoComplete="off"
                  className="w-13 h-14 text-center text-2xl font-bold bg-surface-container-low rounded-2xl border border-outline-variant/40 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary disabled:opacity-40"
                />
              ))}
            </div>

            {/* Actions & Links */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setIsResetPinModalOpen(true);
                }}
                className="text-primary font-semibold hover:underline"
              >
                Forgot PIN?
              </button>

              <div
                onClick={() => {
                  if (!isOnline) triggerOfflineShake();
                }}
              >
                <button
                  type="button"
                  disabled={pinDigits.some((d) => !d) || isSubmitting || lockoutRemainingSec > 0 || !isOnline}
                  onClick={() => handleExecuteTransfer(pinDigits.join(''))}
                  className="h-10 px-5 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Confirm</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {!isOnline && (
              <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center font-medium">
                Connect to the internet to send money.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================= INITIAL PIN SETUP MODAL ================= */}
      {isSetupPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-on-surface">Set Up 4-Digit Transfer PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSetupPinModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              To protect your account against unauthorized transactions, create a 4-digit transfer PIN.
              Avoid repeated digits (0000) or simple sequences (1234).
            </p>

            {setupPinError && (
              <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0" />
                <span>{setupPinError}</span>
              </div>
            )}

            <form onSubmit={handleSaveInitialPin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="newPinInput">
                  4-Digit PIN *
                </label>
                <input
                  id="newPinInput"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={setupPin}
                  onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  required
                  className="w-full h-11 px-3.5 text-center text-xl tracking-widest bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="confirmPinInput">
                  Confirm 4-Digit PIN *
                </label>
                <input
                  id="confirmPinInput"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={setupConfirmPin}
                  onChange={(e) => setSetupConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  required
                  className="w-full h-11 px-3.5 text-center text-xl tracking-widest bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSetupPinModalOpen(false)}
                  className="h-11 rounded-xl bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPin || setupPin.length !== 4 || setupConfirmPin.length !== 4}
                  className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingPin ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Save Transfer PIN</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= FORGOT PIN RESET MODAL ================= */}
      {isResetPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary-container/40 text-tertiary flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-on-surface">Reset Transfer PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPinModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Confirm your account password to authorize resetting your 4-digit transfer PIN.
            </p>

            {resetPinError && (
              <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0" />
                <span>{resetPinError}</span>
              </div>
            )}

            <form onSubmit={handleResetPinSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="resetPwd">
                  Account Password *
                </label>
                <input
                  id="resetPwd"
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="resetNewPin">
                    New 4-Digit PIN *
                  </label>
                  <input
                    id="resetNewPin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={resetNewPin}
                    onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full h-11 px-3.5 text-center text-lg tracking-widest bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="resetConfirmPin">
                    Confirm PIN *
                  </label>
                  <input
                    id="resetConfirmPin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={resetConfirmPin}
                    onChange={(e) => setResetConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full h-11 px-3.5 text-center text-lg tracking-widest bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPinModalOpen(false)}
                  className="h-11 rounded-xl bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPin || !resetPassword || resetNewPin.length !== 4}
                  className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isResettingPin ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Reset PIN</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SUCCESS MODAL ================= */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col gap-5 text-center">
            {/* Top Accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500" />

            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Transfer Completed
              </span>
              <h3 className="text-xl font-bold text-on-surface mt-1">Funds Sent Successfully</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Your transfer has cleared immediately on the institutional ledger.
              </p>
            </div>

            <div className="bg-surface-container-low rounded-xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Amount Sent:</span>
                <span className="font-bold text-sm text-on-surface">{formatCentsToUSD(successData.amountCents)} USD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Recipient:</span>
                <span className="font-semibold text-on-surface">{successData.recipientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Destination Account:</span>
                <span className="font-mono text-on-surface">{maskAccountNumber(successData.accountNumber)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                <span className="text-on-surface-variant font-semibold">New Available Balance:</span>
                <span className="font-bold text-base text-primary font-ledger-numerical">
                  {formatCentsToUSD(successData.newBalanceCents)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs"
              >
                Send Another
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-bold text-xs shadow-xs"
              >
                View in History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Value Biometric Authorization Modal */}
      {user && (
        <BiometricPromptModal
          isOpen={isBiometricModalOpen}
          onClose={() => setIsBiometricModalOpen(false)}
          user={user}
          amountCents={parseUSDToCents(amountStr)}
          recipientName={verifiedRecipient?.ownerName || 'Verified Member'}
          recipientAccount={verifiedRecipient?.accountNumber}
          onSuccess={handleBiometricSuccess}
          onFallbackToPin={handleBiometricFallback}
        />
      )}
    </div>
  );
};
