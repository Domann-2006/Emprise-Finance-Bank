import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SUPPORT_PHONE, APP_NAME } from '../../config/brand';

export const SessionTimeoutModal: React.FC = () => {
  const { isSessionExpiredModalOpen, closeSessionExpiredModal } = useAuth();
  const navigate = useNavigate();

  if (!isSessionExpiredModalOpen) return null;

  const handleReturnToLogin = () => {
    closeSessionExpiredModal();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4">
        {/* Top accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-tertiary via-primary-container to-primary" />

        <div className="flex items-center gap-3 pt-1">
          <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeWidth="2" strokeLinecap="round" d="M12 6v6l4 2" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-on-surface">Session Timed Out</h3>
            <p className="text-xs text-on-surface-variant font-medium">Automatic Security Safeguard</p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant leading-relaxed">
          For your financial protection, your online banking session was securely closed after 15 minutes of inactivity. Any pending changes or unsubmitted requests were safely aborted.
        </p>

        <div className="p-3 bg-surface-container rounded-xl text-xs text-on-surface-variant flex items-center gap-2">
          <span className="font-semibold text-on-surface">Need help?</span>
          <span>Contact {APP_NAME} Member Care at {SUPPORT_PHONE}</span>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <button
            onClick={handleReturnToLogin}
            className="w-full h-12 bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Sign In Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
