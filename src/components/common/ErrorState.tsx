import React from 'react';
import { WifiOff, RotateCcw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Network problem',
  message = 'Check your network connection and try again.',
  icon,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-3 shadow-xs max-w-md mx-auto my-6 animate-fade-in ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
        {icon || <WifiOff className="w-6 h-6" aria-hidden="true" />}
      </div>
      <div>
        <h3 className="text-base font-bold text-on-surface">{title}</h3>
        <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed max-w-sm">
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 h-10 px-5 rounded-xl bg-primary hover:bg-primary-tint text-on-primary font-semibold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Try again</span>
        </button>
      )}
    </div>
  );
};
