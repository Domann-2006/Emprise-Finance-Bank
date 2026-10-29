import React from 'react';

interface PinDotsProps {
  length: number; // 0 to 4
  error?: boolean;
}

export const PinDots: React.FC<PinDotsProps> = ({ length, error = false }) => {
  return (
    <div
      role="status"
      aria-label={`${length} of 4 digits entered`}
      className={`flex items-center justify-center gap-4 py-3 transition-transform ${
        error ? 'animate-[shake_0.4s_ease-in-out]' : ''
      }`}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-[shake_0.4s_ease-in-out] {
            animation: none !important;
          }
        }
      `}</style>
      {[0, 1, 2, 3].map((idx) => {
        const isFilled = idx < length;
        return (
          <div
            key={idx}
            className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
              error
                ? 'bg-error scale-110'
                : isFilled
                ? 'bg-primary scale-110 shadow-xs'
                : 'bg-surface-container-highest border border-outline-variant/50'
            }`}
          />
        );
      })}
    </div>
  );
};
