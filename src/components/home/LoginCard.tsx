import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, LogIn, Eye, EyeOff, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '../../config/brand';

interface LoginCardProps {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  isSubmitting: boolean;
  localError: string | null;
  setLocalError: (err: string | null) => void;
  error: string | null;
  clearError: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  onForgotPasswordClick: () => void;
  usernameInputRef: React.RefObject<HTMLInputElement | null>;
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
}

export const LoginCard: React.FC<LoginCardProps> = ({
  username,
  setUsername,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isSubmitting,
  localError,
  setLocalError,
  error,
  clearError,
  handleSubmit,
  onForgotPasswordClick,
  usernameInputRef,
  passwordInputRef,
}) => {
  return (
    <div
      id="login"
      tabIndex={-1}
      className="bg-surface-container-lowest rounded-3xl shadow-xl border border-outline-variant/30 p-6 sm:p-8 flex flex-col space-y-5 relative overflow-hidden focus:outline-none transition-all duration-300"
    >
      {/* Top Accent Gradient Line */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary-container to-secondary" />

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Member Sign In</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Access your personal and business accounts</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-secondary-container/40 flex items-center justify-center text-primary shadow-xs">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
      </div>

      {/* Error Notice */}
      {(localError || error) && (
        <div
          role="alert"
          className="bg-error-container text-on-error-container rounded-2xl p-3.5 flex items-start gap-2.5 text-xs animate-shake shadow-xs"
        >
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-bold">Sign In Notice</p>
            <p className="opacity-95 mt-0.5">{localError || error}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocalError(null);
              clearError();
            }}
            aria-label="Dismiss error notice"
            className="text-on-error-container/70 hover:text-on-error-container p-0.5"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        {/* Username */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-on-surface" htmlFor="username">
            Username / Member ID
          </label>
          <input
            ref={usernameInputRef}
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            autoComplete="username"
            required
            className="w-full h-12 px-4 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/25 border border-outline-variant/30 transition-all"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-on-surface" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-xs text-primary font-semibold hover:underline focus:outline-none"
            >
              Need help?
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              ref={passwordInputRef}
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
              className="w-full h-12 pl-4 pr-11 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/25 border border-outline-variant/30 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password text' : 'Show password text'}
              className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1.5 transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full mt-2 flex items-center justify-center bg-primary hover:bg-primary-tint text-on-primary font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Log In to {APP_NAME}</span>
            </>
          )}
        </button>
      </form>

      {/* Enrollment Link */}
      <div className="bg-surface-container-low rounded-xl p-3 text-center">
        <p className="text-xs text-on-surface-variant">
          New to {APP_NAME}?{' '}
          <Link to="/signup" className="text-primary font-bold hover:underline">
            Enroll / Open an account
          </Link>
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-on-surface-variant/80">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span>End-to-end encrypted session</span>
      </div>
    </div>
  );
};
