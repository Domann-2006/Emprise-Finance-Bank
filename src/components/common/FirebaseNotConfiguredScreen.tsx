import React from 'react';
import { Logo } from './Logo';
import { APP_NAME, SUPPORT_PHONE_DISPLAY, SUPPORT_EMAIL } from '../../config/brand';
import { AlertTriangle, Server, ShieldCheck, Key, Database } from 'lucide-react';

export const FirebaseNotConfiguredScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-primary-container selection:text-white">
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Logo size="md" variant="dark" />
        <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 bg-error-container/20 text-error rounded-full border border-error/20 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
          Cloud Connection Required
        </span>
      </div>

      {/* Main Content Card */}
      <div className="max-w-xl mx-auto w-full my-auto py-10">
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-8 sm:p-10 shadow-xl shadow-surface-dim/30">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-6">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-3">
            Firebase is Not Configured
          </h1>

          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            {APP_NAME} requires active Firebase Authentication and Cloud Firestore to protect financial transactions and enforce role authorization. In accordance with banking security policy, local mock fallbacks are disabled in production.
          </p>

          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 mb-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-on-surface uppercase tracking-wide">
              <Key className="w-4 h-4 text-primary" /> Required Environment Variables
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Create a <code className="px-1.5 py-0.5 rounded bg-surface font-mono text-primary font-medium">.env</code> file in the project root with your Firebase Web App credentials:
            </p>
            <div className="bg-[#1e232a] text-[#e0e6ed] rounded-lg p-3.5 text-xs font-mono overflow-x-auto space-y-1">
              <div><span className="text-[#89ddff]">VITE_FIREBASE_API_KEY</span>=<span className="text-[#c3e88d]">"AIzaSy..."</span></div>
              <div><span className="text-[#89ddff]">VITE_FIREBASE_AUTH_DOMAIN</span>=<span className="text-[#c3e88d]">"your-project.firebaseapp.com"</span></div>
              <div><span className="text-[#89ddff]">VITE_FIREBASE_PROJECT_ID</span>=<span className="text-[#c3e88d]">"your-project-id"</span></div>
              <div><span className="text-[#89ddff]">VITE_FIREBASE_STORAGE_BUCKET</span>=<span className="text-[#c3e88d]">"your-project.appspot.com"</span></div>
              <div><span className="text-[#89ddff]">VITE_FIREBASE_MESSAGING_SENDER_ID</span>=<span className="text-[#c3e88d]">"123456789"</span></div>
              <div><span className="text-[#89ddff]">VITE_FIREBASE_APP_ID</span>=<span className="text-[#c3e88d]">"1:123456789:web:..."</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-on-surface-variant">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/20">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-on-surface block">Zero Insecure Bypasses</span>
                Authentication must be verified through Firebase Auth.
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/20">
              <Database className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-on-surface block">Atomic Ledger</span>
                Transfers require Firestore runTransaction verification.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs text-on-surface-variant/70 gap-2 border-t border-outline-variant/20 pt-6">
        <div>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <span>Support: {SUPPORT_PHONE_DISPLAY}</span>
          <span>•</span>
          <span>{SUPPORT_EMAIL}</span>
        </div>
      </div>
    </div>
  );
};
