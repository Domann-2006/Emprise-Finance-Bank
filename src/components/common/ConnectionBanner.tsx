import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface ConnectionBannerProps {
  className?: string;
  topOffsetClass?: string;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  className = '',
  topOffsetClass = '',
}) => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const handleShake = () => {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 600);
      return () => clearTimeout(timer);
    };

    window.addEventListener('emprise:shake-offline-banner', handleShake);
    return () => window.removeEventListener('emprise:shake-offline-banner', handleShake);
  }, []);

  const isVisible = !isOnline || wasOffline;

  if (!isVisible) return null;

  const isReconnected = isOnline && wasOffline;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 z-40 pointer-events-auto transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
        topOffsetClass || 'top-16 pt-[env(safe-area-inset-top,0px)]'
      } ${className}`}
    >
      <div
        className={`w-full border-b shadow-md px-4 py-2.5 flex items-center justify-center gap-2.5 text-xs font-medium transition-all ${
          isShaking ? 'animate-shake' : ''
        } ${
          isReconnected
            ? 'bg-emerald-600 text-white border-emerald-700'
            : 'bg-amber-500 text-amber-950 border-amber-600/40'
        }`}
      >
        {isReconnected ? (
          <div className="flex items-center gap-2 animate-fade-in">
            <Wifi className="w-4 h-4 shrink-0 text-white" aria-hidden="true" />
            <span className="font-bold">Back online</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 max-w-4xl text-left animate-fade-in">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-950" aria-hidden="true" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 leading-snug">
              <span className="font-bold shrink-0">No internet connection</span>
              <span className="hidden sm:inline opacity-75">•</span>
              <span className="opacity-95">
                Check your network and try again. Balances and transfers are unavailable until you reconnect.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
