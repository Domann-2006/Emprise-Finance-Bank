import React from 'react';
import { APP_NAME } from '../../config/brand';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'auto',
  showSubtitle = true,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 36 : 28;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  const textColor =
    variant === 'light'
      ? 'text-white'
      : variant === 'dark'
      ? 'text-on-surface'
      : 'text-on-surface dark:text-white';

  const subColor =
    variant === 'light'
      ? 'text-secondary-fixed-dim'
      : 'text-on-surface-variant';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Precision Geometric Financial Monogram Mark */}
      <div
        className="rounded-xl bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-white shadow-sm shrink-0"
        style={{ width: iconSize + 10, height: iconSize + 10 }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Institutional Vault / Horizon Keystone Icon */}
          <path d="M3 21h18" />
          <path d="M3 10h18" />
          <path d="M5 10v11" />
          <path d="M19 10v11" />
          <path d="M9 10v11" />
          <path d="M14 10v11" />
          <path d="M12 3 2 8h20z" />
        </svg>
      </div>

      <div className="flex flex-col min-w-0">
        <span className={`font-bold tracking-tight leading-none ${textSize} ${textColor}`}>
          {APP_NAME}
        </span>
        {showSubtitle && (
          <span className={`text-[10px] font-semibold tracking-wider uppercase mt-1 ${subColor}`}>
            Community Banking
          </span>
        )}
      </div>
    </div>
  );
};
