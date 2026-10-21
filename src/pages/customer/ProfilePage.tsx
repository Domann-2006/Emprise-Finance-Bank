import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerAccount } from '../../services/banking';
import { BankAccount } from '../../types';
import { formatDateTime, maskAccountNumber } from '../../utils/format';
import { UserStatusBadge } from '../../components/common/StatusBadge';
import { APP_NAME, deriveAuthEmail, ROUTING_NUMBER } from '../../config/brand';
import { isFirebaseConfigured, auth } from '../../services/firebase';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import {
  User,
  KeyRound,
  Shield,
  CreditCard,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<BankAccount | null>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const acct = await getCustomerAccount(user.uid);
      setAccount(acct);
    };
    load();
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please provide your current password for security verification.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    if (isFirebaseConfigured() && auth && auth.currentUser && user) {
      try {
        const derivedEmail = deriveAuthEmail(user.username);
        const credential = EmailAuthProvider.credential(derivedEmail, currentPassword);
        // Re-authenticate first as specified
        await reauthenticateWithCredential(auth.currentUser, credential);
        // Update password
        await updatePassword(auth.currentUser, newPassword);

        setPasswordSuccess('Password successfully updated and encrypted.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (err: any) {
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setPasswordError('Current password is incorrect.');
        } else {
          setPasswordError(err.message || 'Unable to update password.');
        }
      } finally {
        setIsUpdatingPassword(false);
      }
    } else {
      // Mock mode: simulate re-authentication
      await new Promise((res) => setTimeout(res, 500));
      if (currentPassword !== 'password123' && currentPassword.length < 6) {
        setPasswordError('Current password verification failed.');
        setIsUpdatingPassword(false);
        return;
      }
      setPasswordSuccess('Password successfully updated (Preview Mode).');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Member Profile & Security</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          View account credentials, personal contact info, and manage password security.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center font-bold text-xl">
              {user?.name?.[0] || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-on-surface">{user?.name}</h2>
                {user?.status && <UserStatusBadge status={user.status} />}
              </div>
              <span className="text-xs font-mono text-primary font-medium">@{user?.username}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold capitalize">
            {user?.role} Tier
          </span>
        </div>

        {/* Account Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 bg-surface-container-low rounded-xl">
            <span className="text-on-surface-variant block mb-1">Primary Account</span>
            <span className="text-sm font-bold text-on-surface block">
              Community {account?.type || 'Checking'}
            </span>
            <span className="text-xs font-mono text-primary font-medium mt-0.5 block">
              {account?.accountNumber ? account.accountNumber : '•••• ----'}
            </span>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl">
            <span className="text-on-surface-variant block mb-1">Electronic Routing</span>
            <span className="text-sm font-bold text-on-surface font-mono block">
              {ROUTING_NUMBER}
            </span>
            <span className="text-xs text-on-surface-variant mt-0.5 block">ACH / Direct Deposit</span>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-on-surface-variant block">Contact Email</span>
              <span className="font-semibold text-on-surface truncate block">{user?.email || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl flex items-start gap-2.5">
            <Phone className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-on-surface-variant block">Mobile Phone</span>
              <span className="font-semibold text-on-surface truncate block">{user?.phone || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl sm:col-span-2 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-on-surface-variant block">Residential Address</span>
              <span className="font-semibold text-on-surface block">
                {user?.address?.street} {user?.address?.apt && `(${user.address.apt})`}, {user?.address?.city}, {user?.address?.state} {user?.address?.zip}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card (Re-authenticate first) */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary-container/40 flex items-center justify-center text-tertiary">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-on-surface">Security & Password</h3>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">Re-authentication enforced</span>
        </div>

        {/* Feedback Notices */}
        {passwordSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current Password (for re-authentication) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface" htmlFor="currentPwd">
              Current Password (to re-authenticate) *
            </label>
            <div className="relative flex items-center">
              <input
                id="currentPwd"
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full h-11 pl-3.5 pr-10 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface" htmlFor="newPwd">
                New Password *
              </label>
              <input
                id="newPwd"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface" htmlFor="confirmPwd">
                Confirm New Password *
              </label>
              <input
                id="confirmPwd"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="h-11 px-5 bg-primary-container hover:bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isUpdatingPassword ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Re-authenticate & Update Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
