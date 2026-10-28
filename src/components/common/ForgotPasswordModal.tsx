import React from 'react';
import { APP_NAME, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, SUPPORT_EMAIL, SUPPORT_HOURS } from '../../config/brand';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4">
        {/* Top accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-tertiary via-primary-container to-primary" />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container/40 text-tertiary flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface">Password Assistance</h3>
              <p className="text-xs text-on-surface-variant">Institutional Account Recovery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-on-surface-variant leading-relaxed">
          To maintain strict financial compliance and safeguard your funds against unauthorized takeover, {APP_NAME} credentials cannot be reset through automated links without voice biometric verification.
        </p>

        <div className="p-4 bg-surface-container-low rounded-xl flex flex-col gap-3 border border-outline-variant/30 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant min-w-0">Direct Member Hotline</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0 whitespace-nowrap">24/7 Available</span>
          </div>

          <a
            href={`tel:+1${SUPPORT_PHONE.replace(/-/g, '')}`}
            className="text-lg font-bold text-primary hover:underline flex items-center gap-2 min-w-0"
          >
            <span className="break-all">{SUPPORT_PHONE_DISPLAY}</span>
          </a>

          <div className="text-xs text-on-surface-variant space-y-1 min-w-0">
            <p className="min-w-0"><strong className="text-on-surface shrink-0">Email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline break-all">{SUPPORT_EMAIL}</a></p>
            <p className="min-w-0"><strong className="text-on-surface shrink-0">Hours:</strong> {SUPPORT_HOURS}</p>
          </div>
        </div>

        <div className="text-xs text-on-surface-variant/80 italic">
          Please have your Member ID or account number ready when calling for identity verification.
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm rounded-xl transition-all"
        >
          Return to Sign In
        </button>
      </div>
    </div>
  );
};
