import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, KeyRound, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { isWeakPin } from '../../utils/pin';
import { useAuth } from '../../context/AuthContext';
import { PinDots } from './PinDots';
import { PinKeypad } from './PinKeypad';

interface ResetPinSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPinSheet: React.FC<ResetPinSheetProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { resetTransferPinWithPassword } = useAuth();

  const [stage, setStage] = useState<'password' | 'new_pin' | 'confirm_pin'>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasShakeError, setHasShakeError] = useState(false);

  useEffect(() => {
    if (!open) {
      setStage('password');
      setPassword('');
      setShowPassword(false);
      setNewPin('');
      setConfirmPin('');
      setError(null);
      setIsSubmitting(false);
      setHasShakeError(false);
    }
  }, [open]);

  if (!open) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your account password.');
      return;
    }
    setError(null);
    setStage('new_pin');
  };

  const currentDigits = stage === 'new_pin' ? newPin : confirmPin;

  const handleDigit = async (digit: string) => {
    if (isSubmitting) return;
    setError(null);
    setHasShakeError(false);

    if (stage === 'new_pin') {
      if (newPin.length < 4) {
        const next = newPin + digit;
        setNewPin(next);
        if (next.length === 4) {
          if (isWeakPin(next)) {
            setError('PIN is too simple. Avoid repeated digits (0000) or sequences (1234).');
            setHasShakeError(true);
            setNewPin('');
            return;
          }
          setTimeout(() => {
            setStage('confirm_pin');
          }, 200);
        }
      }
    } else if (stage === 'confirm_pin') {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          if (next !== newPin) {
            setError('PINs do not match. Please try again.');
            setHasShakeError(true);
            setConfirmPin('');
            setNewPin('');
            setStage('new_pin');
            return;
          }

          setIsSubmitting(true);
          const result = await resetTransferPinWithPassword(password, next);
          setIsSubmitting(false);

          if (result.success) {
            onSuccess();
          } else {
            setError(result.error || 'Failed to reset transfer PIN.');
            setHasShakeError(true);
            setConfirmPin('');
            setNewPin('');
            setStage('password');
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (isSubmitting) return;
    setError(null);
    setHasShakeError(false);
    if (stage === 'new_pin') {
      if (newPin.length > 0) {
        setNewPin((prev) => prev.slice(0, -1));
      }
    } else if (stage === 'confirm_pin') {
      if (confirmPin.length > 0) {
        setConfirmPin((prev) => prev.slice(0, -1));
      } else {
        setStage('new_pin');
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
            <h3 className="text-base font-bold text-on-surface">Reset Transfer PIN</h3>
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

        {stage === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              For your institutional security, please verify your account password before setting a new transfer PIN.
            </p>

            {error && (
              <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface block" htmlFor="resetPwdInput">
                Account Password *
              </label>
              <div className="relative flex items-center">
                <input
                  id="resetPwdInput"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoFocus
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

            <button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Verify & Continue</span>
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-on-surface-variant text-center leading-relaxed">
              {stage === 'new_pin'
                ? 'Enter your new 4-digit transfer PIN.'
                : 'Confirm your new 4-digit transfer PIN.'}
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
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(sheetContent, document.body);
};
