import React, { useState } from 'react';
import { Fingerprint, Check, AlertCircle, X, Shield, Lock } from 'lucide-react';
import { useBiometrics } from '../../features/biometrics/useBiometrics';
import { biometricService } from '../../features/biometrics/biometricService';
import { hashPin } from '../../utils/pin';
import { PinDots } from '../../features/transfer-auth/PinDots';
import { PinKeypad } from '../../features/transfer-auth/PinKeypad';
import ReactDOM from 'react-dom';

interface BiometricSettingsCardProps {
  user: {
    uid: string;
    name: string;
    username: string;
    hasPin?: boolean;
  };
}

export const BiometricSettingsCard: React.FC<BiometricSettingsCardProps> = ({ user }) => {
  const { status, meta, isEnrolled } = useBiometrics(user.uid);

  const [isPinSheetOpen, setIsPinSheetOpen] = useState(false);
  const [pinDigits, setPinDigits] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [hasShakeError, setHasShakeError] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Toggle clicked
  const handleToggle = () => {
    setFeedback(null);

    if (isEnrolled) {
      setShowDisableConfirm(true);
    } else {
      if (!user.hasPin) {
        setFeedback({
          type: 'error',
          message: 'Create your transfer PIN first before enabling biometric authentication.',
        });
        return;
      }
      setPinDigits('');
      setPinError(null);
      setHasShakeError(false);
      setIsPinSheetOpen(true);
    }
  };

  const handleDisableConfirm = async () => {
    setIsDisabling(true);
    await biometricService.disable(user.uid);
    setIsDisabling(false);
    setShowDisableConfirm(false);
    setFeedback({
      type: 'success',
      message: 'Biometric authorization disabled on this device.',
    });
  };

  const handlePinSubmit = async (pinValue: string) => {
    if (pinValue.length !== 4 || isEnrolling) return;

    setIsEnrolling(true);
    setPinError(null);

    try {
      const pinHash = await hashPin(pinValue, user.uid);
      const res = await biometricService.enroll({
        uid: user.uid,
        name: user.name,
        username: user.username,
        pinHash,
      });

      setIsEnrolling(false);

      if (res.success) {
        setIsPinSheetOpen(false);
        setPinDigits('');
        setFeedback({
          type: 'success',
          message: 'Biometric authorization enabled! You can now approve transfers using biometrics.',
        });
      } else {
        setPinError(res.error || 'Failed to enable biometric authentication.');
        setHasShakeError(true);
        setPinDigits('');
      }
    } catch (err: any) {
      setIsEnrolling(false);
      setPinError(err.message || 'Verification failed.');
      setHasShakeError(true);
      setPinDigits('');
    }
  };

  const handleDigit = (digit: string) => {
    if (isEnrolling) return;
    setPinError(null);
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
    if (isEnrolling) return;
    setPinError(null);
    setHasShakeError(false);
    if (pinDigits.length > 0) {
      setPinDigits((prev) => prev.slice(0, -1));
    }
  };

  return (
    <>
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary-container/40 flex items-center justify-center text-primary">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">Biometric Authentication</h3>
              <p className="text-[11px] text-on-surface-variant">
                Fast, secure transfer approval with Touch ID, Face ID, or Windows Hello
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          {status !== 'unsupported' ? (
            <button
              type="button"
              role="switch"
              aria-checked={isEnrolled}
              onClick={handleToggle}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                isEnrolled ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  isEnrolled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant">
              Not Supported
            </span>
          )}
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-800'
                : 'bg-error-container text-on-error-container'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-error shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-on-surface-variant hover:text-on-surface p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* State Content */}
        {status === 'unsupported' ? (
          <div className="p-3.5 bg-surface-container-low rounded-xl text-xs text-on-surface-variant">
            Not available on this device. Your browser or hardware does not report an integrated biometric sensor. You can continue to authorize all transfers using your 4-digit PIN.
          </div>
        ) : isEnrolled ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-semibold text-on-surface block">
                  Enabled on this device ({meta?.deviceLabel || 'Platform Authenticator'})
                </span>
                <span className="text-on-surface-variant block text-[11px] mt-0.5">
                  Approve transfers with one touch. You can still type your PIN at any time.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/10">
              <div>
                Turned on:{' '}
                <strong className="text-on-surface font-semibold">
                  {meta?.createdAt ? new Date(meta.createdAt).toLocaleDateString() : 'Active'}
                </strong>
              </div>
              {meta?.lastUsedAt && (
                <div>
                  Last used:{' '}
                  <strong className="text-on-surface font-semibold">
                    {new Date(meta.lastUsedAt).toLocaleDateString()}
                  </strong>
                </div>
              )}
            </div>

            {/* Disable Confirmation Prompt */}
            {showDisableConfirm && (
              <div className="p-3 bg-error-container/10 border border-error/20 rounded-xl flex items-center justify-between gap-3 text-xs animate-fade-in">
                <span className="text-on-surface font-medium">Turn off biometrics on this device?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDisabling}
                    onClick={handleDisableConfirm}
                    className="h-8 px-3 rounded-lg bg-error hover:bg-error/90 text-on-error font-semibold text-xs cursor-pointer"
                  >
                    {isDisabling ? 'Disabling...' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    disabled={isDisabling}
                    onClick={() => setShowDisableConfirm(false)}
                    className="h-8 px-2.5 rounded-lg border border-outline-variant/40 hover:bg-surface-container text-xs text-on-surface-variant cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <span className="font-semibold text-on-surface block">
              Use your fingerprint or face to approve transfers instead of typing your PIN
            </span>
            <p className="text-on-surface-variant text-[11px] leading-relaxed">
              When enabled, your device's native authenticator will automatically prompt to verify transfers. Biometric data is stored exclusively in your device's secure enclave and never sent to our servers.
            </p>
          </div>
        )}
      </div>

      {/* PIN Verification Sheet to Enable Biometrics */}
      {isPinSheetOpen &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isEnrolling) {
                setIsPinSheetOpen(false);
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
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-on-surface">Enable Biometric Login</h3>
                </div>
                <button
                  type="button"
                  disabled={isEnrolling}
                  onClick={() => setIsPinSheetOpen(false)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-on-surface-variant text-center leading-relaxed">
                Enter your 4-digit transfer PIN to link this device's biometric sensor.
              </p>

              <PinDots length={isEnrolling ? 4 : pinDigits.length} error={hasShakeError} />

              {pinError && (
                <div className="text-center text-xs font-semibold text-error px-2 animate-fade-in min-h-[1.25rem]">
                  {pinError}
                </div>
              )}

              <div className="pt-2">
                <PinKeypad
                  onDigit={handleDigit}
                  onBackspace={handleBackspace}
                  disabled={isEnrolling}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
