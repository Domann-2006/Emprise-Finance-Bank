import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Fingerprint, X, Check, AlertCircle } from 'lucide-react';
import { biometricService } from '../biometrics/biometricService';

interface EnableBiometricsPromptProps {
  open: boolean;
  user: { uid: string; name: string; username: string };
  pinHash: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function shouldShowBiometricPrompt(uid: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`emprise:bioprompt:${uid}`);
    if (!raw) return true;
    const dismissedAt = Number(raw);
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt > thirtyDaysMs;
  } catch {
    return true;
  }
}

export function dismissBiometricPrompt(uid: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`emprise:bioprompt:${uid}`, Date.now().toString());
  } catch {}
}

export const EnableBiometricsPrompt: React.FC<EnableBiometricsPromptProps> = ({
  open,
  user,
  pinHash,
  onClose,
  onSuccess,
}) => {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleDismiss = () => {
    dismissBiometricPrompt(user.uid);
    onClose();
  };

  const handleEnable = async () => {
    setIsEnrolling(true);
    setError(null);

    const result = await biometricService.enroll({
      uid: user.uid,
      name: user.name,
      username: user.username,
      pinHash,
    });

    setIsEnrolling(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Biometric enrollment failed. You can enable it anytime in Security settings.');
    }
  };

  const sheetContent = (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isEnrolling) {
          handleDismiss();
        }
      }}
    >
      <div
        className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 border border-outline-variant/30 animate-slide-up sm:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-outline-variant/40 rounded-full mx-auto sm:hidden -mt-1" />

        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">Pay Faster with Biometrics</h3>
              <p className="text-[11px] text-on-surface-variant">Touch ID, Face ID, or Windows Hello</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isEnrolling}
            onClick={handleDismiss}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Would you like to authorize future transfers instantly with your fingerprint or face instead of typing your 4-digit PIN every time?
        </p>

        {error && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            disabled={isEnrolling}
            onClick={handleDismiss}
            className="h-11 px-4 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-semibold text-on-surface-variant transition-colors cursor-pointer disabled:opacity-50"
          >
            Not Now
          </button>
          <button
            type="button"
            disabled={isEnrolling}
            onClick={handleEnable}
            className="h-11 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isEnrolling ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Enable</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(sheetContent, document.body);
};
