import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface AlertBarProps {
  onDismiss: () => void;
}

export const AlertBar: React.FC<AlertBarProps> = ({ onDismiss }) => {
  return (
    <div
      role="region"
      aria-label="Security Alert"
      className="bg-[#071c36] text-[#e0e3e6] border-b border-outline-variant/20 px-4 py-2 sm:py-2.5 text-xs transition-all"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-4 h-4 text-primary-fixed shrink-0" aria-hidden="true" />
          <p className="leading-snug">
            <strong className="text-white font-semibold mr-1.5">Stay alert:</strong>
            we will never ask for your PIN or password. Protect yourself from fraud.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss fraud warning alert"
          className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
