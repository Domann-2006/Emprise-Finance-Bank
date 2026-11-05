import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerAccount,
  lookupAccountDirectory,
  executeTransferTransaction,
  executeExternalTransfer,
  verifyTransferPin,
} from '../../services/banking';
import { BankAccount, AccountDirectoryEntry } from '../../types';
import { formatCentsToUSD, maskAccountNumber, parseUSDToCents } from '../../utils/format';
import { hashPin } from '../../utils/pin';
import { isValidRoutingNumber, isOwnRoutingNumber } from '../../utils/routing';
import {
  APP_NAME,
  BANK_NAME,
  ROUTING_NUMBER,
  ACH_PER_TRANSFER_LIMIT_CENTS,
  ACH_PROCESSING_TEXT,
} from '../../config/brand';
import { useDraftState } from '../../hooks/useDraftState';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getFriendlyError, withTimeout, triggerOfflineShake } from '../../utils/errorMessages';
import { ErrorState } from '../../components/common/ErrorState';
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Check,
  Zap,
  Building,
  HelpCircle,
  X,
  Clock,
} from 'lucide-react';
import { TransferAuthorization } from '../../features/transfer-auth/types';
import { TransferAuthSheet } from '../../features/transfer-auth/TransferAuthSheet';
import { SetupPinSheet } from '../../features/transfer-auth/SetupPinSheet';
import { ResetPinSheet } from '../../features/transfer-auth/ResetPinSheet';
import {
  EnableBiometricsPrompt,
  shouldShowBiometricPrompt,
} from '../../features/transfer-auth/EnableBiometricsPrompt';
import { biometricService } from '../../features/biometrics/biometricService';

interface TransferSuccessData {
  transferType: 'internal' | 'ach';
  newBalanceCents: number;
  amountCents: number;
  recipientName: string;
  accountNumber: string;
  routingNumber?: string;
  accountType?: 'Checking' | 'Savings';
}

export const TransferPage: React.FC = () => {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [accountLoadError, setAccountLoadError] = useState<{ title: string; message: string } | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  // Target method: null by default, persisted in draft
  const [targetMethod, setTargetMethod, clearTargetMethod] = useDraftState<'internal' | 'ach' | null>(
    user?.uid,
    'transfer_target_method',
    null
  );

  // Internal transfer draft persistence
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

  // ACH transfer draft persistence
  const [achRecipientName, setAchRecipientName, clearAchRecipientName] = useDraftState(
    user?.uid,
    'transfer_ach_name',
    ''
  );
  const [achRoutingNumber, setAchRoutingNumber, clearAchRoutingNumber] = useDraftState(
    user?.uid,
    'transfer_ach_routing',
    ''
  );
  const [achAccountNumber, setAchAccountNumber, clearAchAccountNumber] = useDraftState(
    user?.uid,
    'transfer_ach_account',
    ''
  );
  const [achAccountType, setAchAccountType, clearAchAccountType] = useDraftState<'Checking' | 'Savings' | ''>(
    user?.uid,
    'transfer_ach_type',
    ''
  );
  const [achAmountStr, setAchAmountStr, clearAchAmount] = useDraftState(
    user?.uid,
    'transfer_ach_amount',
    ''
  );
  const [achMemo, setAchMemo, clearAchMemo] = useDraftState(
    user?.uid,
    'transfer_ach_memo',
    ''
  );

  const [routingNotice, setRoutingNotice] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Sheets state
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);
  const [isSetupPinSheetOpen, setIsSetupPinSheetOpen] = useState(false);
  const [isResetPinSheetOpen, setIsResetPinSheetOpen] = useState(false);

  // Biometric upsell prompt after PIN transfer
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  const [pendingBioPinHash, setPendingBioPinHash] = useState<string | null>(null);

  // Success Modal State
  const [successData, setSuccessData] = useState<TransferSuccessData | null>(null);

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

  // Close success modal on Escape key press
  useEffect(() => {
    if (!successData) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSuccessData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [successData]);

  // Real-time lookup of internal recipient account number (10 digits)
  useEffect(() => {
    if (targetMethod !== 'internal') return;
    const cleanNum = recipientAccountNum.trim();
    if (cleanNum.length === 10) {
      if (account && cleanNum === account.accountNumber) {
        setVerifiedRecipient(null);
        setLookupError('Self-transfer is not permitted. Please choose another recipient account.');
        return;
      }

      let isMounted = true;
      setIsVerifyingRecipient(true);
      setLookupError(null);

      lookupAccountDirectory(cleanNum)
        .then((entry) => {
          if (!isMounted) return;
          if (entry) {
            setVerifiedRecipient(entry);
            setLookupError(null);
          } else {
            setVerifiedRecipient(null);
            setLookupError('Account not found. Please double-check the 10-digit account number.');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setVerifiedRecipient(null);
          const friendly = getFriendlyError(err);
          setLookupError(friendly.message);
        })
        .finally(() => {
          if (isMounted) setIsVerifyingRecipient(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setVerifiedRecipient(null);
      setLookupError(null);
      setIsVerifyingRecipient(false);
    }
  }, [recipientAccountNum, account, targetMethod]);

  // Handle ACH Routing Number input with auto-switch if own routing number
  const handleAchRoutingChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 9);
    setAchRoutingNumber(digitsOnly);

    if (digitsOnly.length === 9) {
      if (isOwnRoutingNumber(digitsOnly)) {
        // Automatically switch to Emprise Finance tab
        setTargetMethod('internal');
        setRoutingNotice(
          "That's an Emprise Finance routing number. Use the Emprise Finance tab for free, instant transfers."
        );
        clearAchRoutingNumber();
      }
    }
  };

  // Pre-transfer validation before opening the auth sheet
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    if (!account) {
      setTransferError('Your account details could not be loaded. Please refresh and try again.');
      return;
    }

    if (!user) {
      setTransferError('No active session found. Please sign in again.');
      return;
    }

    // Require PIN setup if user doesn't have a PIN configured
    if (!user.hasPin) {
      setIsSetupPinSheetOpen(true);
      return;
    }

    if (targetMethod === 'internal') {
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
    } else if (targetMethod === 'ach') {
      if (!achRecipientName.trim()) {
        setTransferError('Please enter the recipient full name.');
        return;
      }
      if (achRoutingNumber.trim().length !== 9 || !isValidRoutingNumber(achRoutingNumber.trim())) {
        setTransferError('Invalid routing number (ABA checksum failed).');
        return;
      }
      if (isOwnRoutingNumber(achRoutingNumber.trim())) {
        setTargetMethod('internal');
        setRoutingNotice(
          "That's an Emprise Finance routing number. Use the Emprise Finance tab for free, instant transfers."
        );
        clearAchRoutingNumber();
        return;
      }
      const acctNumTrim = achAccountNumber.trim();
      if (acctNumTrim.length < 4 || acctNumTrim.length > 17) {
        setTransferError('Recipient account number must be between 4 and 17 digits.');
        return;
      }
      if (!achAccountType) {
        setTransferError('Please select recipient account type (Checking or Savings).');
        return;
      }
      const achCents = parseUSDToCents(achAmountStr);
      if (achCents <= 0) {
        setTransferError('Transfer amount must be greater than $0.00.');
        return;
      }
      if (achCents > ACH_PER_TRANSFER_LIMIT_CENTS) {
        setTransferError('ACH transfers are limited to $25,000.00 per transfer.');
        return;
      }
      if (account.balanceCents < achCents) {
        setTransferError(
          `Insufficient funds. Your available balance is ${formatCentsToUSD(account.balanceCents)}.`
        );
        return;
      }
    } else {
      setTransferError('Please select a transfer destination.');
      return;
    }

    // Open OPay-style payment authorization sheet
    setIsAuthSheetOpen(true);
  };

  // Process transaction from TransferAuthSheet
  const submitTransfer = async (
    authorization: TransferAuthorization
  ): Promise<{ ok: true } | { ok: false; code: string; message: string }> => {
    if (!account || !user) {
      return { ok: false, code: 'INVALID_STATE', message: 'Missing account details.' };
    }

    try {
      // 1. Verify transfer PIN / Biometric assertion first
      await verifyTransferPin(authorization, user.uid);

      if (targetMethod === 'internal') {
        if (!verifiedRecipient) {
          return { ok: false, code: 'INVALID_STATE', message: 'Missing recipient details.' };
        }
        const cents = parseUSDToCents(amountStr);

        // 2. Execute atomic ledger transaction
        const result = await executeTransferTransaction({
          senderAccountId: account.id,
          senderUid: user.uid,
          recipientAccountNumber: recipientAccountNum.trim(),
          amountCents: cents,
          note: note.trim(),
          authorization,
        });

        // 3. Update local state & success screen
        setAccount({ ...account, balanceCents: result.senderNewBalanceCents });
        setSuccessData({
          transferType: 'internal',
          newBalanceCents: result.senderNewBalanceCents,
          amountCents: cents,
          recipientName: result.recipientName,
          accountNumber: recipientAccountNum.trim(),
        });

        // 4. Clear internal drafts
        clearRecipient();
        clearAmount();
        clearMemo();
        setVerifiedRecipient(null);
        setIsAuthSheetOpen(false);
      } else if (targetMethod === 'ach') {
        const achCents = parseUSDToCents(achAmountStr);

        // 2. Execute atomic external transfer
        const result = await executeExternalTransfer({
          senderAccountId: account.id,
          senderUid: user.uid,
          recipientName: achRecipientName.trim(),
          routingNumber: achRoutingNumber.trim(),
          accountNumber: achAccountNumber.trim(),
          accountType: achAccountType as 'Checking' | 'Savings',
          amountCents: achCents,
          memo: achMemo.trim(),
          authorization,
        });

        // 3. Update local state & success screen
        setAccount({ ...account, balanceCents: result.newBalanceCents });
        setSuccessData({
          transferType: 'ach',
          newBalanceCents: result.newBalanceCents,
          amountCents: achCents,
          recipientName: achRecipientName.trim(),
          accountNumber: achAccountNumber.trim(),
          routingNumber: achRoutingNumber.trim(),
          accountType: achAccountType as 'Checking' | 'Savings',
        });

        // 4. Clear ACH drafts
        clearAchRecipientName();
        clearAchRoutingNumber();
        clearAchAccountNumber();
        clearAchAccountType();
        clearAchAmount();
        clearAchMemo();
        setIsAuthSheetOpen(false);
      }

      // 5. If authorized with PIN, check eligibility for biometric upsell
      if (authorization.method === 'pin') {
        const bioStatus = await biometricService.getStatus(user.uid);
        if (bioStatus === 'available' && shouldShowBiometricPrompt(user.uid)) {
          const derivedHash = await hashPin(authorization.pin, user.uid);
          setPendingBioPinHash(derivedHash);
          setShowBioPrompt(true);
        }
      }

      return { ok: true };
    } catch (err: any) {
      const code = err?.code || 'UNKNOWN';
      const friendly = getFriendlyError(err);
      return {
        ok: false,
        code,
        message: err?.message || friendly.message || 'Payment could not be processed.',
      };
    }
  };

  // ACH validations for button disabled state
  const isAchAmountValid = () => {
    const cents = parseUSDToCents(achAmountStr);
    return cents > 0 && cents <= ACH_PER_TRANSFER_LIMIT_CENTS && (!account || cents <= account.balanceCents);
  };

  const isAchFormValid = () => {
    return (
      achRecipientName.trim().length > 0 &&
      achRoutingNumber.trim().length === 9 &&
      isValidRoutingNumber(achRoutingNumber.trim()) &&
      !isOwnRoutingNumber(achRoutingNumber.trim()) &&
      achAccountNumber.trim().length >= 4 &&
      achAccountNumber.trim().length <= 17 &&
      (achAccountType === 'Checking' || achAccountType === 'Savings') &&
      isAchAmountValid() &&
      isOnline
    );
  };

  const isInternalFormValid = () => {
    const cents = parseUSDToCents(amountStr);
    return (
      Boolean(verifiedRecipient) &&
      cents > 0 &&
      (!account || cents <= account.balanceCents) &&
      isOnline
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full animate-fade-in pb-16">
      {/* Title & Context */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Transfer Money</h1>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Secure Settlement</span>
          </span>
        </div>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          Send institutional funds within {BANK_NAME} or across the US ACH network.
        </p>
      </div>

      {/* Account Loading & Error States */}
      {isLoadingAccount ? (
        <div className="p-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-on-surface-variant">Loading your account details...</span>
        </div>
      ) : accountLoadError ? (
        <ErrorState
          title={accountLoadError.title}
          message={accountLoadError.message}
          onRetry={loadAccount}
        />
      ) : account && (
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-on-surface-variant font-medium block">
                {account.type} Account ({maskAccountNumber(account.accountNumber)})
              </span>
              <span className="text-xl font-bold text-on-surface font-ledger-numerical">
                {formatCentsToUSD(account.balanceCents)}
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800">
            Available
          </span>
        </div>
      )}

      {/* Transfer Form Container */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        {/* Destination Method Segmented Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1">
            <label className="text-xs font-semibold text-on-surface">Destination</label>
            <span className="text-xs text-on-surface-variant font-medium">Step 1 of 2</span>
          </div>

          <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-2xl border border-outline-variant/30">
            <button
              type="button"
              onClick={() => {
                setTargetMethod('internal');
                setRoutingNotice(null);
                setTransferError(null);
              }}
              className={`h-11 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetMethod === 'internal'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Zap className="w-4 h-4 text-primary" />
              <span>{BANK_NAME}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetMethod('ach');
                setRoutingNotice(null);
                setTransferError(null);
              }}
              className={`h-11 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetMethod === 'ach'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Building className="w-4 h-4 text-tertiary" />
              <span>Another bank</span>
            </button>
          </div>
        </div>

        {/* Notice when auto-redirected from own routing number */}
        {routingNotice && (
          <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
              <span>{routingNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setRoutingNotice(null)}
              className="text-primary/70 hover:text-primary p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Global Transfer Error */}
        {transferError && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span>{transferError}</span>
          </div>
        )}

        {/* No Selection Helper */}
        {targetMethod === null && (
          <div className="py-10 px-4 text-center rounded-2xl bg-surface-container-low/50 border border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-2">
            <Building className="w-8 h-8 text-on-surface-variant/40" />
            <p className="text-sm font-semibold text-on-surface">Choose where the money is going.</p>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Select <strong>{BANK_NAME}</strong> for instant transfers to other members, or <strong>Another bank</strong> for standard ACH transfers.
            </p>
          </div>
        )}

        {/* ================= TAB 1: EMPRISE FINANCE (INTERNAL) ================= */}
        {targetMethod === 'internal' && (
          <form onSubmit={handleInitiateSend} className="space-y-4 animate-fade-in">
            {/* Recipient Account Number Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="recipientAccount" className="text-xs font-semibold text-on-surface">
                  Recipient Account Number (10 Digits) *
                </label>
                {isVerifyingRecipient && (
                  <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
                    <div className="w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin" />
                    Verifying...
                  </span>
                )}
              </div>
              <input
                id="recipientAccount"
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={recipientAccountNum}
                onChange={(e) => setRecipientAccountNum(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 1029384756"
                required
                className="w-full h-12 px-4 rounded-xl bg-surface-container-low text-on-surface text-sm border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 font-mono"
              />

              {/* Subtle read-only info line */}
              <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                <span>Bank: {BANK_NAME}</span>
                <span>•</span>
                <span className="font-mono">Routing {ROUTING_NUMBER}</span>
              </p>

              {/* Recipient Verified Badge */}
              {verifiedRecipient && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl text-xs flex items-center justify-between animate-fade-in mt-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Verified Recipient: <strong className="font-bold">{verifiedRecipient.ownerName}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                    Active Member
                  </span>
                </div>
              )}

              {/* Recipient Lookup Error */}
              {lookupError && (
                <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs flex items-center gap-2 animate-fade-in mt-1">
                  <AlertCircle className="w-4 h-4 text-error shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}
            </div>

            {/* Transfer Amount Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="amount" className="text-xs font-semibold text-on-surface">
                  Amount (USD) *
                </label>
                {account && (
                  <button
                    type="button"
                    onClick={() => setAmountStr((account.balanceCents / 100).toFixed(2))}
                    className="text-xs text-primary font-bold hover:underline cursor-pointer"
                  >
                    Max: {formatCentsToUSD(account.balanceCents)}
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-lg font-bold text-on-surface-variant font-ledger-numerical">$</span>
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(val)) {
                      setAmountStr(val);
                    }
                  }}
                  placeholder="0.00"
                  required
                  className="w-full h-12 pl-8 pr-4 rounded-xl bg-surface-container-low text-on-surface text-lg font-bold border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 font-ledger-numerical"
                />
              </div>
            </div>

            {/* Memo / Note Field */}
            <div className="space-y-1.5">
              <label htmlFor="memo" className="text-xs font-semibold text-on-surface">
                Transfer Memo (Optional)
              </label>
              <input
                id="memo"
                type="text"
                maxLength={60}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Dinner reimbursement, Rent"
                className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface text-xs border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Fee & Delivery Info */}
            <div className="p-3 bg-surface-container-low rounded-xl text-xs flex items-center justify-between border border-outline-variant/20">
              <span className="text-on-surface-variant">Transfer Fee & Speed</span>
              <span className="font-semibold text-emerald-700">$0.00 • Instant</span>
            </div>

            {/* Send Action Button */}
            <div
              onClick={() => {
                if (!isOnline) triggerOfflineShake();
              }}
              className="w-full pt-1"
            >
              <button
                type="submit"
                disabled={!isInternalFormValid()}
                className="h-12 w-full bg-primary-container hover:bg-primary text-on-primary font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Continue to Authorize</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ================= TAB 2: ANOTHER BANK (ACH) ================= */}
        {targetMethod === 'ach' && (
          <form onSubmit={handleInitiateSend} className="space-y-4 animate-fade-in">
            {/* Recipient Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="achName" className="text-xs font-semibold text-on-surface">
                Recipient Full Legal Name *
              </label>
              <input
                id="achName"
                type="text"
                value={achRecipientName}
                onChange={(e) => setAchRecipientName(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
                className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface text-sm border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Recipient 9-digit Routing Number */}
            <div className="space-y-1.5">
              <label htmlFor="achRouting" className="text-xs font-semibold text-on-surface">
                Recipient Routing Number (9 Digits) *
              </label>
              <input
                id="achRouting"
                type="text"
                inputMode="numeric"
                maxLength={9}
                value={achRoutingNumber}
                onChange={(e) => handleAchRoutingChange(e.target.value)}
                placeholder="e.g. 021000021"
                required
                className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface text-sm font-mono border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
              />

              {/* ABA Checksum feedback */}
              {achRoutingNumber.length === 9 && !isValidRoutingNumber(achRoutingNumber) && (
                <p className="text-xs text-error font-medium animate-fade-in">
                  Invalid routing number (ABA checksum failed)
                </p>
              )}
              {achRoutingNumber.length === 9 && isValidRoutingNumber(achRoutingNumber) && (
                <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 animate-fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Valid ABA routing number</span>
                </p>
              )}
            </div>

            {/* Recipient Account Number (4-17 Digits) */}
            <div className="space-y-1.5">
              <label htmlFor="achAccount" className="text-xs font-semibold text-on-surface">
                Recipient Account Number (4–17 Digits) *
              </label>
              <input
                id="achAccount"
                type="text"
                inputMode="numeric"
                maxLength={17}
                value={achAccountNumber}
                onChange={(e) => setAchAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 17))}
                placeholder="e.g. 1234567890"
                required
                className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface text-sm font-mono border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
              />
              {achAccountNumber.length > 0 && achAccountNumber.length < 4 && (
                <p className="text-xs text-on-surface-variant font-medium">
                  Account number must be at least 4 digits ({achAccountNumber.length}/4).
                </p>
              )}
            </div>

            {/* Account Type (Checking vs Savings) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface">
                Account Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAchAccountType('Checking')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    achAccountType === 'Checking'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <span className="font-bold text-xs text-on-surface block">Checking</span>
                  <span className="text-[11px] text-on-surface-variant block mt-0.5">Transactional</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAchAccountType('Savings')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    achAccountType === 'Savings'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <span className="font-bold text-xs text-on-surface block">Savings</span>
                  <span className="text-[11px] text-on-surface-variant block mt-0.5">Deposit account</span>
                </button>
              </div>
            </div>

            {/* Transfer Amount (max $25,000) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="achAmount" className="text-xs font-semibold text-on-surface">
                  Amount (USD) * (Max $25,000.00)
                </label>
                {account && (
                  <button
                    type="button"
                    onClick={() => {
                      const maxPossible = Math.min(account.balanceCents, ACH_PER_TRANSFER_LIMIT_CENTS);
                      setAchAmountStr((maxPossible / 100).toFixed(2));
                    }}
                    className="text-xs text-primary font-bold hover:underline cursor-pointer"
                  >
                    Max: {formatCentsToUSD(Math.min(account.balanceCents, ACH_PER_TRANSFER_LIMIT_CENTS))}
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-lg font-bold text-on-surface-variant font-ledger-numerical">$</span>
                <input
                  id="achAmount"
                  type="text"
                  inputMode="decimal"
                  value={achAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(val)) {
                      setAchAmountStr(val);
                    }
                  }}
                  placeholder="0.00"
                  required
                  className="w-full h-12 pl-8 pr-4 rounded-xl bg-surface-container-low text-on-surface text-lg font-bold border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 font-ledger-numerical"
                />
              </div>
              {parseUSDToCents(achAmountStr) > ACH_PER_TRANSFER_LIMIT_CENTS && (
                <p className="text-xs text-error font-medium animate-fade-in">
                  ACH transfers are limited to $25,000.00 per transfer.
                </p>
              )}
            </div>

            {/* Memo (max 100 chars) */}
            <div className="space-y-1.5">
              <label htmlFor="achMemo" className="text-xs font-semibold text-on-surface">
                Memo / Reference (Optional, max 100 chars)
              </label>
              <input
                id="achMemo"
                type="text"
                maxLength={100}
                value={achMemo}
                onChange={(e) => setAchMemo(e.target.value)}
                placeholder="e.g. Invoice payment, Vendor bill"
                className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface text-xs border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Fee & Delivery Info Box */}
            <div className="p-3 bg-surface-container-low rounded-xl text-xs flex items-center justify-between border border-outline-variant/20">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Standard Delivery</span>
              </div>
              <span className="font-semibold text-primary">
                Fee: $0.00 • Standard ACH delivery ({ACH_PROCESSING_TEXT})
              </span>
            </div>

            {/* Authorize Action Button */}
            <div
              onClick={() => {
                if (!isOnline) triggerOfflineShake();
              }}
              className="w-full pt-1"
            >
              <button
                type="submit"
                disabled={!isAchFormValid()}
                className="h-12 w-full bg-primary-container hover:bg-primary text-on-primary font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Continue to Authorize</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {!isOnline && (
          <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center font-medium">
            Connect to the internet to send money.
          </p>
        )}
      </div>

      {/* ================= SUCCESS MODAL (INTERNAL & ACH) ================= */}
      {successData && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSuccessData(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 pt-8 sm:p-7 sm:pt-9 shadow-2xl relative overflow-hidden flex flex-col gap-5 text-center"
          >
            {/* Top Accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSuccessData(null)}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>

            {successData.transferType === 'ach' ? (
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  ACH Transfer Initiated
                </span>
                <h3 className="text-xl font-bold text-on-surface mt-1">ACH Transfer Initiated</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Your transfer has been submitted and is processing.
                </p>
              </div>
            ) : (
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Transfer Completed
                </span>
                <h3 className="text-xl font-bold text-on-surface mt-1">Funds Sent Successfully</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Your transfer has cleared immediately on the institutional ledger.
                </p>
              </div>
            )}

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
                <span className="font-mono text-on-surface">
                  {successData.transferType === 'ach'
                    ? `••••${successData.accountNumber.slice(-4)}`
                    : maskAccountNumber(successData.accountNumber)}
                </span>
              </div>

              {successData.transferType === 'ach' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Routing Number:</span>
                    <span className="font-mono text-on-surface">{successData.routingNumber}</span>
                  </div>
                  {successData.accountType && (
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Account Type:</span>
                      <span className="font-semibold text-on-surface">{successData.accountType}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Delivery:</span>
                    <span className="font-semibold text-on-surface">{ACH_PROCESSING_TEXT}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Status:</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 font-bold text-[10px] uppercase">
                      Pending
                    </span>
                  </div>
                </>
              )}

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
                className="h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs cursor-pointer"
              >
                Send Another
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-bold text-xs shadow-xs cursor-pointer"
              >
                View in History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= OPay-Style Transfer Authorization Sheet ================= */}
      {user && (
        <TransferAuthSheet
          open={isAuthSheetOpen}
          amountCents={targetMethod === 'ach' ? parseUSDToCents(achAmountStr) : parseUSDToCents(amountStr)}
          recipientName={targetMethod === 'ach' ? achRecipientName.trim() : (verifiedRecipient?.ownerName || 'Verified Member')}
          recipientAccount={targetMethod === 'ach' ? achAccountNumber.trim() : (verifiedRecipient?.accountNumber || recipientAccountNum.trim())}
          transferType={targetMethod || 'internal'}
          routingNumber={targetMethod === 'ach' ? achRoutingNumber.trim() : ROUTING_NUMBER}
          userUid={user.uid}
          onClose={() => setIsAuthSheetOpen(false)}
          onForgotPin={() => setIsResetPinSheetOpen(true)}
          onSubmit={submitTransfer}
        />
      )}

      {/* ================= Setup PIN Sheet ================= */}
      <SetupPinSheet
        open={isSetupPinSheetOpen}
        onClose={() => setIsSetupPinSheetOpen(false)}
        onSuccess={() => {
          setIsSetupPinSheetOpen(false);
          setIsAuthSheetOpen(true);
        }}
      />

      {/* ================= Reset PIN Sheet ================= */}
      <ResetPinSheet
        open={isResetPinSheetOpen}
        onClose={() => setIsResetPinSheetOpen(false)}
        onSuccess={() => {
          setIsResetPinSheetOpen(false);
          setIsAuthSheetOpen(true);
        }}
      />

      {/* ================= Enable Biometrics Upsell Prompt ================= */}
      {user && pendingBioPinHash && (
        <EnableBiometricsPrompt
          open={showBioPrompt}
          user={user}
          pinHash={pendingBioPinHash}
          onClose={() => {
            setShowBioPrompt(false);
            setPendingBioPinHash(null);
          }}
          onSuccess={() => {
            setShowBioPrompt(false);
            setPendingBioPinHash(null);
          }}
        />
      )}
    </div>
  );
};
