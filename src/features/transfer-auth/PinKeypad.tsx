import React, { useEffect, useCallback } from 'react';
import { Delete } from 'lucide-react';

interface PinKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  bottomLeft?: React.ReactNode;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onDigit,
  onBackspace,
  disabled = false,
  bottomLeft,
}) => {
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
  }, []);

  const handlePressDigit = useCallback(
    (digit: string) => {
      if (disabled) return;
      triggerHaptic();
      onDigit(digit);
    },
    [disabled, triggerHaptic, onDigit]
  );

  const handlePressBackspace = useCallback(() => {
    if (disabled) return;
    triggerHaptic();
    onBackspace();
  }, [disabled, triggerHaptic, onBackspace]);

  // Support hardware keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      // Ignore if user is typing in an active text input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePressDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePressBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handlePressDigit, handlePressBackspace]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="w-full max-w-xs mx-auto grid grid-cols-3 gap-y-3 gap-x-6 justify-items-center select-none">
      {digits.map((digit) => (
        <button
          key={digit}
          type="button"
          disabled={disabled}
          onClick={() => handlePressDigit(digit)}
          aria-label={`Digit ${digit}`}
          className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-surface-container-low hover:bg-surface-container active:bg-surface-container-high text-on-surface font-semibold text-2xl font-ledger-numerical flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shadow-xs"
        >
          {digit}
        </button>
      ))}

      {/* Bottom row: [bottomLeft slot] [0] [Backspace] */}
      <div className="w-16 h-16 min-w-[64px] min-h-[64px] flex items-center justify-center">
        {bottomLeft || <div className="w-16 h-16" />}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => handlePressDigit('0')}
        aria-label="Digit 0"
        className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-surface-container-low hover:bg-surface-container active:bg-surface-container-high text-on-surface font-semibold text-2xl font-ledger-numerical flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shadow-xs"
      >
        0
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={handlePressBackspace}
        aria-label="Backspace"
        className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-transparent hover:bg-surface-container active:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Delete className="w-6 h-6" />
      </button>
    </div>
  );
};
