import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Fingerprint, Lock, ShieldAlert } from 'lucide-react';
import { formatCentsToUSD, maskAccountNumber } from '../../utils/format';
import { TransferAuthorization } from './types';
import { PinDots } from './PinDots';
import { PinKeypad } from './PinKeypad';
import { usePinLockout } from './usePinLockout';
import { biometricService } from '../biometrics/biometricService';
import { useBiometrics } from '../biometrics/useBiometrics';

interface TransferAuthSheetProps {
  open: boolean;
  amountCents: number;
  recipientName: string;
  recipientAccount: string;
  userUid: string;
  onClose: () => void;
  onForgotPin: () => void;
  onSubmit: (
    authorization: TransferAuthorization
  ) => Promise<{ ok: true } | { ok: false; code: string; message: string }>;
}

export const TransferAuthSheet: React.FC<TransferAuthSheetProps> = ({
  open,
  amountCents,
  recipientName,
  recipientAccount,
  userUid,
  onClose,
  onForgotPin,
  onSubmit,
}) => {
  const { isEnrolled } = useBiometrics(userUid);
  const lockout = usePinLockout(userUid);

  const [pinDigits, setPinDigits] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gentleHint, setGentleHint] = useState<string | null>(null);
  const [hasShakeError, setHasShakeError] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const autoPromptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoPromptedRef = useRef(false);

  // Clear state when sheet closes
  useEffect(() => {
    if (!open) {
      setPinDigits('');
      setIsSubmitting(false);
      setIsScanning(false);
      setErrorMessage(null);
      setGentleHint(null);
      setHasShakeError(false);
      hasAutoPromptedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (autoPromptTimerRef.current) {
        clearTimeout(autoPromptTimerRef.current);
        autoPromptTimerRef.current = null;
      }
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isSubmitting, onClose]);

  // Biometric authorization handler
  const handleBiometricAuth = useCallback(async () => {
    if (isSubmitting || isScanning) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsScanning(true);
    setErrorMessage(null);

    try {
      const result = await biometricService.authorize(userUid, controller.signal);
      setIsScanning(false);

      if (result.success) {
        setGentleHint(null);
        setIsSubmitting(true);
        const submitRes = await onSubmit({ method: 'biometric', pinHash: result.pinHash });
        setIsSubmitting(false);

        if (!submitRes.ok) {
          if (submitRes.code === 'BIOMETRIC_STALE') {
            await biometricService.disable(userUid);
            setErrorMessage(
              'Your PIN was changed, so biometric payment was turned off. Enter your PIN, then turn it on again in Security.'
            );
          } else if (submitRes.code === 'NETWORK') {
            setErrorMessage('Network problem. Check your network connection and try again.');
          } else if (submitRes.code === 'TRANSFER_PERMISSION') {
            setErrorMessage('Transfer could not be completed. Please try again or contact support.');
          } else {
            setErrorMessage(submitRes.message || 'Payment authorization failed.');
          }
          setHasShakeError(true);
        }
      } else {
        // Biometric failed or cancelled: stay on keypad with gentle hint, no red error
        if (result.reason === 'vault_error') {
          setGentleHint('Biometric credentials unreadable. Please enter your PIN.');
        } else {
          setGentleHint('Biometric cancelled. Enter your PIN or tap the fingerprint icon.');
        }
      }
    } catch {
      setIsScanning(false);
      setGentleHint('Biometric cancelled. Enter your PIN or tap the fingerprint icon.');
    } finally {
      abortControllerRef.current = null;
    }
  }, [isSubmitting, isScanning, userUid, onSubmit]);

  // Auto-prompt biometrics once after 350ms if enrolled
  useEffect(() => {
    if (open && isEnrolled && !hasAutoPromptedRef.current && !lockout.isLocked) {
      hasAutoPromptedRef.current = true;
      autoPromptTimerRef.current = setTimeout(() => {
        handleBiometricAuth();
      }, 350);
    }
    return () => {
      if (autoPromptTimerRef.current) {
        clearTimeout(autoPromptTimerRef.current);
      }
    };
  }, [open, isEnrolled, lockout.isLocked, handleBiometricAuth]);

  // Submit with 4-digit PIN
  const handlePinSubmit = async (pinValue: string) => {
    if (pinValue.length !== 4 || isSubmitting) return;

    // Abort any ongoing biometric prompt
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setGentleHint(null);

    const submitRes = await onSubmit({ method: 'pin', pin: pinValue });
    setIsSubmitting(false);

    if (!submitRes.ok) {
      setPinDigits('');
      setHasShakeError(true);

      if (submitRes.code === 'WRONG_PIN') {
        const failResult = lockout.registerFailure();
        if (failResult.isLocked) {
          setErrorMessage('Too many failed PIN attempts. Locked for 15 minutes.');
        } else {
          setErrorMessage(`Incorrect PIN. ${failResult.attemptsLeft} attempt(s) remaining.`);
        }
      } else if (submitRes.code === 'NETWORK') {
        setErrorMessage('Network problem. Check your network connection and try again.');
      } else if (submitRes.code === 'TRANSFER_PERMISSION') {
        setErrorMessage('Transfer could not be completed. Please try again or contact support.');
      } else {
        setErrorMessage(submitRes.message || 'Payment authorization failed.');
      }
    }
  };

  const handleDigit = (digit: string) => {
    if (lockout.isLocked || isSubmitting) return;
    setErrorMessage(null);
    setGentleHint(null);
    setHasShakeError(false);

    if (pinDigits.length < 4) {
      const next = pinDigits + digit;
      setPinDigits(next);
      if (next.length === 4) {
        handlePinSubmit(next);
      }
    }
  };

  const handleBackspace = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setHasShakeError(false);
    if (pinDigits.length > 0) {
      setPinDigits((prev) => prev.slice(0, -1));
    }
  };

  if (!open) return null;

  const formatLockoutTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sheetContent = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 border border-outline-variant/30 animate-slide-up sm:animate-none max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle Bar for mobile */}
        <div className="w-12 h-1 bg-outline-variant/40 rounded-full mx-auto sm:hidden -mt-1" />

        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-on-surface">Confirm Payment</h3>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transfer Summary Card */}
        <div className="p-4 bg-surface-container-low rounded-2xl space-y-2 border border-outline-variant/30 text-center">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
            Transfer Amount
          </span>
          <div className="text-3xl font-extrabold text-on-surface font-ledger-numerical">
            {formatCentsToUSD(amountCents)}
          </div>
          <div className="pt-2 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-on-surface-variant">
            <span>
              To: <strong className="text-on-surface font-semibold">{recipientName}</strong>
            </span>
            <span className="font-mono text-[11px]">{maskAccountNumber(recipientAccount)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/10">
            <span>Transaction Fee</span>
            <span className="font-semibold text-emerald-700">Fee: $0.00</span>
          </div>
        </div>

        {/* Lockout Warning Banner */}
        {lockout.isLocked && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-950 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block">PIN Entry Locked</span>
              <span className="text-amber-900 block text-[11px]">
                Try again in <span className="font-mono font-bold">{formatLockoutTimer(lockout.remainingSec)}</span>
                {isEnrolled && ' or authenticate with biometrics below.'}
              </span>
            </div>
          </div>
        )}

        {/* Prompt line */}
        <div className="text-center space-y-0.5">
          <p className="text-xs font-semibold text-on-surface">
            {isSubmitting
              ? 'Processing payment...'
              : isEnrolled
              ? 'Verify with biometrics or enter your PIN'
              : 'Enter your 4-digit payment PIN'}
          </p>
          {gentleHint && !errorMessage && !lockout.isLocked && (
            <p className="text-[11px] text-on-surface-variant animate-fade-in">
              {gentleHint}
            </p>
          )}
        </div>

        {/* Pin Dots */}
        <PinDots length={isSubmitting ? 4 : pinDigits.length} error={hasShakeError} />

        {/* Inline error message */}
        {errorMessage && (
          <div className="text-center text-xs font-semibold text-error px-2 animate-fade-in min-h-[1.25rem]">
            {errorMessage}
          </div>
        )}

        {/* Pin Keypad */}
        <div className="pt-1">
          <PinKeypad
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            disabled={lockout.isLocked || isSubmitting}
            bottomLeft={
              isEnrolled ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleBiometricAuth}
                  aria-label="Authenticate with biometrics"
                  className={`w-16 h-16 min-w-[64px] min-h-[64px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isScanning
                      ? 'bg-primary-container text-on-primary ring-4 ring-primary/30 animate-pulse'
                      : 'bg-primary/10 hover:bg-primary/20 text-primary active:scale-95'
                  }`}
                >
                  <Fingerprint className="w-7 h-7" />
                </button>
              ) : null
            }
          />
        </div>

        {/* Forgot PIN link */}
        <div className="text-center pt-1 pb-1">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              onClose();
              onForgotPin();
            }}
            className="text-xs font-medium text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            Forgot PIN?
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(sheetContent, document.body);
};
