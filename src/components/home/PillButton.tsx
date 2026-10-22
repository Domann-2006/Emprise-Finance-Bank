import React from 'react';
import { Link } from 'react-router-dom';

interface PillButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
  href?: string;
  className?: string;
  ariaLabel?: string;
}

export const PillButton: React.FC<PillButtonProps> = ({
  children,
  onClick,
  to,
  href,
  className = '',
  ariaLabel,
}) => {
  // Small, rounded-full, light teal background, dark navy bold uppercase text (text-xs tracking-wide)
  const pillClasses = `inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#cbeef0] hover:bg-[#b2eae5] text-[#071c36] font-bold text-xs uppercase tracking-wide shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${className}`;

  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel} className={pillClasses}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} aria-label={ariaLabel} className={pillClasses}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={pillClasses}>
      {children}
    </button>
  );
};
