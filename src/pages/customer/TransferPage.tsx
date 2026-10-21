import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerAccount,
  lookupAccountDirectory,
  executeTransferTransaction,
} from '../../services/banking';
import { BankAccount, AccountDirectoryEntry } from '../../types';
import { formatCentsToUSD, maskAccountNumber, parseUSDToCents } from '../../utils/format';
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  User,
  Check,
  Zap,
} from 'lucide-react';

export const TransferPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [recipientAccountNum, setRecipientAccountNum] = useState('');
  const [verifiedRecipient, setVerifiedRecipient] = useState<AccountDirectoryEntry | null>(null);
  const [isVerifyingRecipient, setIsVerifyingRecipient] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [amountStr, setAmountStr] = useState('50.00');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Success Modal State
  const [successData, setSuccessData] = useState<{
    newBalanceCents: number;
    amountCents: number;
    recipientName: string;
    accountNumber: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const acct = await getCustomerAccount(user.uid);
      setAccount(acct);
    };
    load();
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
      if (clean.length > 0 && clean.length !== 10) {
        // waiting for 10 digits
      }
    }
  }, [recipientAccountNum, account]);

  const handleQuickAdd = (increment: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + increment).toFixed(2));
  };

  const handleSelectRecent = (acctNum: string) => {
    setRecipientAccountNum(acctNum);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    if (!account || !user) {
      setTransferError('Account details not ready.');
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

    setIsSubmitting(true);
    try {
      const result = await executeTransferTransaction({
        senderAccountId: account.id,
        senderUid: user.uid,
        recipientAccountNumber: recipientAccountNum.trim(),
        amountCents: cents,
        note: note.trim(),
      });

      // Update local state
      setAccount({ ...account, balanceCents: result.senderNewBalanceCents });
      setSuccessData({
        newBalanceCents: result.senderNewBalanceCents,
        amountCents: cents,
        recipientName: result.recipientName,
        accountNumber: recipientAccountNum.trim(),
      });
      // Clear form
      setAmountStr('50.00');
      setNote('');
      setRecipientAccountNum('');
      setVerifiedRecipient(null);
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full animate-fade-in">
      {/* Title & Context */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Transfer Money</h1>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Instant</span>
          </span>
        </div>
        <p className="text-xs text-on-surface-variant">Send funds directly to any verified account number</p>
      </div>

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

      {/* Form Error Banner */}
      {transferError && (
        <div className="p-3.5 bg-error-container text-on-error-container rounded-xl flex items-start gap-2 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{transferError}</div>
        </div>
      )}

      {/* Main Transfer Form Card */}
      <form
        onSubmit={handleSend}
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
              placeholder="e.g. 4829103309"
              required
              className="w-full h-12 px-3.5 bg-surface-container-low rounded-xl text-base font-mono text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 tracking-wider"
            />
          </div>

          {/* Quick Contact Chips to test transfers easily */}
          <div className="pt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[11px] text-on-surface-variant shrink-0">Sample:</span>
            <button
              type="button"
              onClick={() => handleSelectRecent('4829108421')}
              className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-[11px] font-medium shrink-0"
            >
              Elena (4829108421)
            </button>
            <button
              type="button"
              onClick={() => handleSelectRecent('4829103309')}
              className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-[11px] font-medium shrink-0"
            >
              Marcus (4829103309)
            </button>
            <button
              type="button"
              onClick={() => handleSelectRecent('4829104829')}
              className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-[11px] font-medium shrink-0"
            >
              Alex (4829104829)
            </button>
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

        {/* Send Action Button */}
        <button
          type="submit"
          disabled={isSubmitting || !verifiedRecipient}
          className="h-12 w-full mt-2 bg-primary-container hover:bg-primary text-on-primary font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Send Money Now</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Success Modal */}
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
                Your atomic transfer has cleared immediately on the institutional ledger.
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
    </div>
  );
};
