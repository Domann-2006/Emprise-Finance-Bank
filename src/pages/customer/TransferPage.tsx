import React, { useState, useEffect } from 'react';
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
import { hashPin } from '../../utils/pin';
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
  HelpCircle,
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

export const TransferPage: React.FC = () => {
  const { user } = useAuth();
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

  const [transferError, setTransferError] = useState<string | null>(null);

  // Sheets state
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);
  const [isSetupPinSheetOpen, setIsSetupPinSheetOpen] = useState(false);
  const [isResetPinSheetOpen, setIsResetPinSheetOpen] = useState(false);

  // Biometric upsell prompt after PIN transfer
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  const [pendingBioPinHash, setPendingBioPinHash] = useState<string | null>(null);

  // Success Modal State
  const [successData, setSuccessData] = useState<{
    newBalanceCents: number;
    amountCents: number;
    recipientName: string;
    accountNumber: string;
  } | null>(null);

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

  // Real-time lookup of recipient account number (10 digits)
  useEffect(() => {
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
  }, [recipientAccountNum, account]);

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

    // Open OPay-style payment authorization sheet
    setIsAuthSheetOpen(true);
  };

  // Process transaction from TransferAuthSheet
  const submitTransfer = async (
    authorization: TransferAuthorization
  ): Promise<{ ok: true } | { ok: false; code: string; message: string }> => {
    if (!account || !user || !verifiedRecipient) {
      return { ok: false, code: 'INVALID_STATE', message: 'Missing account or recipient details.' };
    }

    const cents = parseUSDToCents(amountStr);

    try {
      // 1. Verify transfer PIN / Biometric assertion first
      await verifyTransferPin(authorization, user.uid);

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
        newBalanceCents: result.senderNewBalanceCents,
        amountCents: cents,
        recipientName: result.recipientName,
        accountNumber: recipientAccountNum.trim(),
      });

      // 4. Clear drafts
      clearRecipient();
      clearAmount();
      clearMemo();
      setVerifiedRecipient(null);
      setIsAuthSheetOpen(false);

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

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full animate-fade-in pb-16">
      {/* Title & Context */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Transfer Money</h1>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Settlement</span>
          </span>
        </div>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          Send institutional funds securely to any verified Emprise Finance account.
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

      {/* Transfer Form */}
      <form
        onSubmit={handleInitiateSend}
        className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 border border-outline-variant/30 shadow-xs flex flex-col gap-5"
      >
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <h2 className="text-base font-bold text-on-surface">Recipient & Amount</h2>
          <span className="text-xs text-on-surface-variant font-medium">Step 1 of 2</span>
        </div>

        {transferError && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span>{transferError}</span>
          </div>
        )}

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

          {/* Recipient Verified Badge */}
          {verifiedRecipient && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl text-xs flex items-center justify-between animate-fade-in">
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
            <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs flex items-center gap-2 animate-fade-in">
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

        {/* Send Action Button */}
        <div
          onClick={() => {
            if (!isOnline) triggerOfflineShake();
          }}
          className="w-full"
        >
          <button
            type="submit"
            disabled={!verifiedRecipient || !isOnline}
            className="h-12 w-full mt-2 bg-primary-container hover:bg-primary text-on-primary font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Continue to Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {!isOnline && (
          <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center font-medium">
            Connect to the internet to send money.
          </p>
        )}
      </form>

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
          amountCents={parseUSDToCents(amountStr)}
          recipientName={verifiedRecipient?.ownerName || 'Verified Member'}
          recipientAccount={verifiedRecipient?.accountNumber || recipientAccountNum}
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
