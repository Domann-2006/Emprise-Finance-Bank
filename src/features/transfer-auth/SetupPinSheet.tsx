import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, KeyRound, AlertCircle, Check } from 'lucide-react';
import { isWeakPin } from '../../utils/pin';
import { useAuth } from '../../context/AuthContext';
import { PinDots } from './PinDots';
import { PinKeypad } from './PinKeypad';

interface SetupPinSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SetupPinSheet: React.FC<SetupPinSheetProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { setTransferPin } = useAuth();

  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasShakeError, setHasShakeError] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('create');
      setFirstPin('');
      setConfirmPin('');
      setError(null);
      setIsSubmitting(false);
      setHasShakeError(false);
    }
  }, [open]);

  if (!open) return null;

  const currentDigits = step === 'create' ? firstPin : confirmPin;

  const handleDigit = async (digit: string) => {
    if (isSubmitting) return;
    setError(null);
    setHasShakeError(false);

    if (step === 'create') {
      if (firstPin.length < 4) {
        const next = firstPin + digit;
        setFirstPin(next);
        if (next.length === 4) {
          if (isWeakPin(next)) {
            setError('PIN is too simple. Avoid repeated digits (0000) or sequences (1234).');
            setHasShakeError(true);
            setFirstPin('');
            return;
          }
          // Proceed to confirm step
          setTimeout(() => {
            setStep('confirm');
          }, 200);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          if (next !== firstPin) {
            setError('PINs do not match. Please try again.');
            setHasShakeError(true);
            setConfirmPin('');
            setFirstPin('');
            setStep('create');
            return;
          }

          // Submit new PIN
          setIsSubmitting(true);
          const result = await setTransferPin(next);
          setIsSubmitting(false);

          if (result.success) {
            onSuccess();
          } else {
            setError(result.error || 'Failed to set transfer PIN.');
            setHasShakeError(true);
            setConfirmPin('');
            setFirstPin('');
            setStep('create');
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (isSubmitting) return;
    setError(null);
    setHasShakeError(false);
    if (step === 'create') {
      if (firstPin.length > 0) {
        setFirstPin((prev) => prev.slice(0, -1));
      }
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin((prev) => prev.slice(0, -1));
      } else {
        // Step back to create
        setStep('create');
      }
    }
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
        <div className="w-12 h-1 bg-outline-variant/40 rounded-full mx-auto sm:hidden -mt-1" />

        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-on-surface">
              {step === 'create' ? 'Create Transfer PIN' : 'Confirm Your PIN'}
            </h3>
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

        <p className="text-xs text-on-surface-variant text-center leading-relaxed">
          {step === 'create'
            ? 'Set a 4-digit PIN to authorize transfers. Avoid simple sequences or repeated numbers.'
            : 'Re-enter your 4-digit PIN to confirm.'}
        </p>

        <PinDots length={currentDigits.length} error={hasShakeError} />

        {error && (
          <div className="text-center text-xs font-semibold text-error px-2 animate-fade-in min-h-[1.25rem]">
            {error}
          </div>
        )}

        <div className="pt-2">
          <PinKeypad
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(sheetContent, document.body);
};
