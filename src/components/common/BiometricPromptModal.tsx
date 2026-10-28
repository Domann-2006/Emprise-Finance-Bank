import React, { useState } from 'react';
import {
  verifyBiometrics,
  registerBiometricCredential,
  BiometricConfig,
  getBiometricConfig,
} from '../../services/biometrics';
import { formatCentsToUSD } from '../../utils/format';
import {
  Fingerprint,
  ScanFace,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  ArrowRight,
  KeyRound,
} from 'lucide-react';

interface BiometricPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { uid: string; name: string; username: string };
  amountCents?: number;
  recipientName?: string;
  recipientAccount?: string;
  onSuccess: (verifiedAt: number) => void;
  onFallbackToPin?: () => void;
  mode?: 'verify' | 'enroll' | 'test';
}

export const BiometricPromptModal: React.FC<BiometricPromptModalProps> = ({
  isOpen,
  onClose,
  user,
  amountCents = 0,
  recipientName = '',
  recipientAccount = '',
  onSuccess,
  onFallbackToPin,
  mode = 'verify',
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const config = getBiometricConfig(user.uid);
  const isEnrolled = Boolean(config.enabled && config.credentialId);

  const handleVerify = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const result = await verifyBiometrics({
        uid: user.uid,
        amountCents,
        recipientName,
      });

      if (result.success && result.verifiedAt) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsScanning(false);
          onSuccess(result.verifiedAt!);
        }, 800);
      } else {
        setIsScanning(false);
        setErrorMsg(result.error || 'Biometric authentication was not completed.');
      }
    } catch (err: any) {
      setIsScanning(false);
      setErrorMsg(err.message || 'Unable to communicate with biometric hardware.');
    }
  };

  const handleEnrollAndVerify = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const res = await registerBiometricCredential(user);
      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsScanning(false);
          onSuccess(Date.now());
        }, 800);
      } else {
        setIsScanning(false);
        setErrorMsg(res.error || 'Failed to complete biometric enrollment.');
      }
    } catch (err: any) {
      setIsScanning(false);
      setErrorMsg(err.message || 'Biometric setup failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col gap-5 border border-outline-variant/30">
        {/* Top security accent gradient */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-primary to-teal-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface">
                {mode === 'enroll'
                  ? 'Enroll Device Biometrics'
                  : mode === 'test'
                  ? 'Test Biometric Sensor'
                  : 'High-Value Security Check'}
              </h3>
              <p className="text-xs text-on-surface-variant font-medium">
                Web Authentication API (WebAuthn)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction Summary Card (for transfer verification) */}
        {mode === 'verify' && amountCents > 0 && (
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant uppercase font-semibold tracking-wider">
                Transaction Amount
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-bold text-[11px]">
                High-Value Transfer
              </span>
            </div>
            <div className="text-2xl font-black text-on-surface font-ledger-numerical">
              {formatCentsToUSD(amountCents)}
            </div>
            <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">Recipient:</span>
              <span className="font-semibold text-on-surface truncate max-w-[200px]">
                {recipientName} {recipientAccount && `(${recipientAccount})`}
              </span>
            </div>
          </div>
        )}

        {/* Biometric Interactive Central Graphic */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3 text-center">
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isSuccess
                  ? 'bg-emerald-500 text-white ring-8 ring-emerald-500/20'
                  : isScanning
                  ? 'bg-primary-container text-on-primary ring-8 ring-primary/20 animate-pulse'
                  : 'bg-primary/10 text-primary ring-4 ring-primary/10 hover:scale-105'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              ) : (
                <Fingerprint className="w-10 h-10" />
              )}
            </div>
            {isScanning && !isSuccess && (
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
          </div>

          <div className="space-y-1 max-w-xs">
            <h4 className="text-sm font-bold text-on-surface">
              {isSuccess
                ? 'Biometric Verification Confirmed'
                : isScanning
                ? 'Scan Your Fingerprint or Face'
                : isEnrolled
                ? 'Verify with Touch ID / Face ID'
                : 'Enable One-Touch Verification'}
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {isSuccess
                ? 'Your cryptographic identity proof has been validated.'
                : isScanning
                ? 'Please follow the prompt on your device sensor or security key.'
                : isEnrolled
                ? 'Touch ID, Face ID, or Windows Hello verifies that you authorized this high-value payment.'
                : 'Enroll your device sensor in seconds to protect high-value transfers against account drainage.'}
            </p>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span className="min-w-0 break-words">{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          {isEnrolled ? (
            <button
              type="button"
              disabled={isScanning || isSuccess}
              onClick={handleVerify}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Fingerprint className="w-4 h-4" />
              <span>{isScanning ? 'Awaiting Device Sensor...' : 'Authenticate with Biometrics'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isScanning || isSuccess}
              onClick={handleEnrollAndVerify}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ScanFace className="w-4 h-4" />
              <span>{isScanning ? 'Registering Credential...' : 'Enroll & Verify This Device'}</span>
            </button>
          )}

          {/* PIN Fallback Option */}
          {mode === 'verify' && onFallbackToPin && (
            <button
              type="button"
              disabled={isScanning || isSuccess}
              onClick={() => {
                onClose();
                onFallbackToPin();
              }}
              className="w-full h-10 text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Use 4-Digit Transaction PIN Fallback</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
