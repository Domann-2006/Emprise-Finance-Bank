import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCustomerAccount } from '../../services/banking';
import { BankAccount } from '../../types';
import { formatDateTime, maskAccountNumber } from '../../utils/format';
import { UserStatusBadge } from '../../components/common/StatusBadge';
import { APP_NAME, deriveAuthEmail, ROUTING_NUMBER } from '../../config/brand';
import { isFirebaseConfigured, isMockEnabled, auth } from '../../services/firebase';
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
  Pencil,
  Lock,
  LogOut,
  X,
} from 'lucide-react';
import { isWeakPin } from '../../utils/pin';
import { useDraftState } from '../../hooks/useDraftState';

export const ProfilePage: React.FC = () => {
  const {
    user,
    updateProfile,
    logout,
    setTransferPin,
    changeTransferPin,
    resetTransferPinWithPassword,
  } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<BankAccount | null>(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Form Fields State with draft persistence
  const [email, setEmail, clearEmailDraft] = useDraftState(user?.uid, 'profile_email', user?.email || '');
  const [phone, setPhone, clearPhoneDraft] = useDraftState(user?.uid, 'profile_phone', user?.phone || '');
  const [street, setStreet, clearStreetDraft] = useDraftState(user?.uid, 'profile_street', user?.address?.street || '');
  const [apt, setApt, clearAptDraft] = useDraftState(user?.uid, 'profile_apt', user?.address?.apt || '');
  const [city, setCity, clearCityDraft] = useDraftState(user?.uid, 'profile_city', user?.address?.city || '');
  const [state, setState, clearStateDraft] = useDraftState(user?.uid, 'profile_state', user?.address?.state || '');
  const [zip, setZip, clearZipDraft] = useDraftState(user?.uid, 'profile_zip', user?.address?.zip || '');

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  }>({});

  // Sign out confirmation state
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // PIN Management state
  const [pinModalType, setPinModalType] = useState<'setup' | 'change' | 'reset' | null>(null);
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinPassword, setPinPassword] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [isPinSubmitting, setIsPinSubmitting] = useState(false);

  const resetProfileFields = () => {
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setStreet(user?.address?.street || '');
    setApt(user?.address?.apt || '');
    setCity(user?.address?.city || '');
    setState(user?.address?.state || '');
    setZip(user?.address?.zip || '');
    clearEmailDraft();
    clearPhoneDraft();
    clearStreetDraft();
    clearAptDraft();
    clearCityDraft();
    clearStateDraft();
    clearZipDraft();
    setFieldErrors({});
    setProfileError(null);
  };

  useEffect(() => {
    if (user && !isEditing) {
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setStreet(user.address?.street || '');
      setApt(user.address?.apt || '');
      setCity(user.address?.city || '');
      setState(user.address?.state || '');
      setZip(user.address?.zip || '');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const acct = await getCustomerAccount(user.uid);
      setAccount(acct);
    };
    load();
  }, [user]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const errs: typeof fieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanStreet = street.trim();
    const cleanCity = city.trim();
    const cleanState = state.trim().toUpperCase();
    const cleanZip = zip.trim();

    if (!cleanEmail) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address.';
    }

    const digits = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      errs.phone = 'Mobile phone is required.';
    } else if (digits.length < 10) {
      errs.phone = 'Phone number must contain at least 10 digits.';
    }

    if (!cleanStreet) {
      errs.street = 'Street address is required.';
    }

    if (!cleanCity) {
      errs.city = 'City is required.';
    }

    if (!cleanState) {
      errs.state = 'State is required.';
    } else if (!/^[A-Za-z]{2}$/.test(cleanState)) {
      errs.state = 'State must be a 2-letter abbreviation (e.g. IL).';
    }

    if (!cleanZip) {
      errs.zip = 'ZIP code is required.';
    } else if (!/^\d{5}$/.test(cleanZip)) {
      errs.zip = 'ZIP code must be 5 digits.';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);

    const res = await updateProfile({
      email: cleanEmail,
      phone: cleanPhone,
      address: {
        street: cleanStreet,
        apt: apt.trim(),
        city: cleanCity,
        state: cleanState,
        zip: cleanZip,
      },
    });

    setIsSaving(false);

    if (res.success) {
      clearEmailDraft();
      clearPhoneDraft();
      clearStreetDraft();
      clearAptDraft();
      clearCityDraft();
      clearStateDraft();
      clearZipDraft();
      setProfileSuccess('Profile updated successfully.');
      setIsEditing(false);
      setTimeout(() => {
        setProfileSuccess(null);
      }, 4000);
    } else {
      setProfileError(res.error || 'Failed to update profile. Please try again.');
    }
  };

  const handleSetupPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    const cleanPin = pinNew.trim();
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    if (isWeakPin(cleanPin)) {
      setPinError('PIN is too simple. Avoid repeated digits (like 1111) or sequences (like 1234).');
      return;
    }
    if (cleanPin !== pinConfirm.trim()) {
      setPinError('PIN confirmation does not match.');
      return;
    }

    setIsPinSubmitting(true);
    const res = await setTransferPin(cleanPin);
    setIsPinSubmitting(false);

    if (res.success) {
      setPinSuccess('Transfer PIN configured successfully.');
      setTimeout(() => {
        setPinModalType(null);
        setPinNew('');
        setPinConfirm('');
        setPinSuccess(null);
      }, 1500);
    } else {
      setPinError(res.error || 'Failed to set transfer PIN.');
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    const cleanCurr = pinCurrent.trim();
    const cleanNew = pinNew.trim();

    if (cleanCurr.length !== 4 || !/^\d{4}$/.test(cleanCurr)) {
      setPinError('Current PIN must be 4 digits.');
      return;
    }
    if (cleanNew.length !== 4 || !/^\d{4}$/.test(cleanNew)) {
      setPinError('New PIN must be 4 digits.');
      return;
    }
    if (isWeakPin(cleanNew)) {
      setPinError('New PIN is too simple. Avoid repeated digits or straight sequences.');
      return;
    }
    if (cleanNew !== pinConfirm.trim()) {
      setPinError('New PIN confirmation does not match.');
      return;
    }

    setIsPinSubmitting(true);
    const res = await changeTransferPin(cleanCurr, cleanNew);
    setIsPinSubmitting(false);

    if (res.success) {
      setPinSuccess('Transfer PIN updated successfully.');
      setTimeout(() => {
        setPinModalType(null);
        setPinCurrent('');
        setPinNew('');
        setPinConfirm('');
        setPinSuccess(null);
      }, 1500);
    } else {
      setPinError(res.error || 'Failed to update transfer PIN.');
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (!pinPassword) {
      setPinError('Account password is required for security verification.');
      return;
    }
    const cleanNew = pinNew.trim();
    if (cleanNew.length !== 4 || !/^\d{4}$/.test(cleanNew)) {
      setPinError('New PIN must be 4 digits.');
      return;
    }
    if (isWeakPin(cleanNew)) {
      setPinError('New PIN is too simple. Avoid repeated digits or straight sequences.');
      return;
    }
    if (cleanNew !== pinConfirm.trim()) {
      setPinError('New PIN confirmation does not match.');
      return;
    }

    setIsPinSubmitting(true);
    const res = await resetTransferPinWithPassword(pinPassword, cleanNew);
    setIsPinSubmitting(false);

    if (res.success) {
      setPinSuccess('Transfer PIN reset successfully.');
      setTimeout(() => {
        setPinModalType(null);
        setPinPassword('');
        setPinNew('');
        setPinConfirm('');
        setPinSuccess(null);
      }, 1500);
    } else {
      setPinError(res.error || 'Password verification failed.');
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

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
    } else if (isMockEnabled) {
      // Mock mode: simulate re-authentication strictly in dev mode
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
    } else {
      setPasswordError('Firebase is not configured. Live authentication is required.');
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full pb-24 animate-fade-in">
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
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center font-bold text-xl shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-on-surface truncate">{user?.name}</h2>
                {user?.status && <UserStatusBadge status={user.status} />}
              </div>
              <span className="text-xs font-mono text-primary font-medium block truncate">@{user?.username}</span>
              <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant mt-0.5">
                <Lock className="w-3 h-3 text-on-surface-variant/70 shrink-0" />
                <span>To change your legal name, contact Member Care.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  resetProfileFields();
                  setIsEditing(true);
                }}
                className="h-9 px-3.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-semibold text-primary flex items-center gap-1.5 transition-colors active:scale-[0.98]"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    resetProfileFields();
                    setIsEditing(false);
                  }}
                  className="h-9 px-3 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-medium text-on-surface-variant transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveProfile}
                  className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Notifications for Profile */}
        {profileSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        {/* Read-Only Account Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 bg-surface-container-low rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-on-surface-variant">Primary Account</span>
              <Lock className="w-3 h-3 text-on-surface-variant/50" />
            </div>
            <span className="text-sm font-bold text-on-surface block">
              Community {account?.type || 'Checking'}
            </span>
            <span className="text-xs font-mono text-primary font-medium mt-0.5 block">
              {account?.accountNumber ? account.accountNumber : '•••• ----'}
            </span>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-on-surface-variant">Electronic Routing</span>
              <Lock className="w-3 h-3 text-on-surface-variant/50" />
            </div>
            <span className="text-sm font-bold text-on-surface font-mono block">
              {ROUTING_NUMBER}
            </span>
            <span className="text-xs text-on-surface-variant mt-0.5 block">ACH / Direct Deposit</span>
          </div>
        </div>

        {/* Form Fields: Edit Mode vs View Mode */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Contact Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="profileEmail">
                  Contact Email *
                </label>
                <input
                  id="profileEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="name@example.com"
                  disabled={isSaving}
                  className={`w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border transition-colors ${
                    fieldErrors.email ? 'border-error ring-1 ring-error/20' : 'border-outline-variant/30'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-error font-medium mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Mobile Phone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="profilePhone">
                  Mobile Phone *
                </label>
                <input
                  id="profilePhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  placeholder="(312) 555-0100"
                  disabled={isSaving}
                  className={`w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border transition-colors ${
                    fieldErrors.phone ? 'border-error ring-1 ring-error/20' : 'border-outline-variant/30'
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-error font-medium mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Residential Address Fields */}
            <div className="space-y-3 pt-2 border-t border-outline-variant/15">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                Residential Address
              </span>

              {/* Street & Apt */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="profileStreet">
                    Street Address *
                  </label>
                  <input
                    id="profileStreet"
                    type="text"
                    autoComplete="street-address"
                    value={street}
                    onChange={(e) => {
                      setStreet(e.target.value);
                      if (fieldErrors.street) setFieldErrors((p) => ({ ...p, street: undefined }));
                    }}
                    placeholder="123 Main St"
                    disabled={isSaving}
                    className={`w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border transition-colors ${
                      fieldErrors.street ? 'border-error ring-1 ring-error/20' : 'border-outline-variant/30'
                    }`}
                  />
                  {fieldErrors.street && (
                    <p className="text-xs text-error font-medium mt-1">{fieldErrors.street}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="profileApt">
                    Apt / Suite <span className="text-on-surface-variant font-normal">(optional)</span>
                  </label>
                  <input
                    id="profileApt"
                    type="text"
                    autoComplete="address-line2"
                    value={apt}
                    onChange={(e) => setApt(e.target.value)}
                    placeholder="Apt 4B"
                    disabled={isSaving}
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                </div>
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="profileCity">
                    City *
                  </label>
                  <input
                    id="profileCity"
                    type="text"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (fieldErrors.city) setFieldErrors((p) => ({ ...p, city: undefined }));
                    }}
                    placeholder="Chicago"
                    disabled={isSaving}
                    className={`w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border transition-colors ${
                      fieldErrors.city ? 'border-error ring-1 ring-error/20' : 'border-outline-variant/30'
                    }`}
                  />
                  {fieldErrors.city && (
                    <p className="text-xs text-error font-medium mt-1">{fieldErrors.city}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="profileState">
                    State (2 letters) *
                  </label>
                  <input
                    id="profileState"
                    type="text"
                    maxLength={2}
                    autoComplete="address-level1"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value.toUpperCase());
                      if (fieldErrors.state) setFieldErrors((p) => ({ ...p, state: undefined }));
                    }}
                    placeholder="IL"
                    disabled={isSaving}
                    className={`w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface uppercase focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border transition-colors ${
                      fieldErrors.state ? 'border-error ring-1 ring-error/20' : 'border-outline-variant/30'
                    }`}
                  />
                  {fieldErrors.state && (
                    <p className="text-xs text-error font-medium mt-1">{fieldErrors.state}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="profileZip">
                    ZIP (5 digits) *
                  </label>
                  <input
                    id="profileZip"
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    autoComplete="postal-code"
                    value={zip}
                    onChange={(e) => {
                      setZip(e.target.value);
                      if (fieldErrors.zip) setFieldErrors((p) => ({ ...p, zip: undefined }));
                    }}
                    placeholder="60601"
                    disabled={isSaving}
                    className={`w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border transition-colors ${
                      fieldErrors.zip ? 'border-error ring-1 ring-error/20' : 'border-outline-variant/30'
                    }`}
                  />
                  {fieldErrors.zip && (
                    <p className="text-xs text-error font-medium mt-1">{fieldErrors.zip}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile-only form buttons inside the card */}
            <div className="flex sm:hidden items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  resetProfileFields();
                  setIsEditing(false);
                }}
                className="h-11 px-4 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-medium text-on-surface-variant transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 bg-surface-container-low rounded-xl flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-on-surface-variant block text-xs">Contact Email</span>
                <span className="font-semibold text-on-surface truncate block text-xs sm:text-sm">{user?.email || 'N/A'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-surface-container-low rounded-xl flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-on-surface-variant block text-xs">Mobile Phone</span>
                <span className="font-semibold text-on-surface truncate block text-xs sm:text-sm">{user?.phone || 'N/A'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-surface-container-low rounded-xl sm:col-span-2 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-on-surface-variant block text-xs">Residential Address</span>
                <span className="font-semibold text-on-surface block text-xs sm:text-sm">
                  {user?.address?.street} {user?.address?.apt && `(${user.address.apt})`}, {user?.address?.city}, {user?.address?.state} {user?.address?.zip}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transfer PIN Security Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">Transfer Authorization PIN</h3>
              <p className="text-[11px] text-on-surface-variant">Required to authorize customer-to-customer transfers</p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              user?.hasPin
                ? 'bg-emerald-500/10 text-emerald-800'
                : 'bg-amber-500/10 text-amber-800'
            }`}
          >
            {user?.hasPin ? 'Configured' : 'Not Set'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-on-surface block">
              {user?.hasPin ? 'PIN Status: •••• (Active)' : 'No transfer PIN configured'}
            </span>
            <span className="text-on-surface-variant block mt-0.5">
              {user?.hasPin
                ? 'A 4-digit PIN is verified every time you send money to another member.'
                : 'Set a 4-digit PIN before initiating peer-to-peer transfers.'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user?.hasPin ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPinModalType('change');
                    setPinCurrent('');
                    setPinNew('');
                    setPinConfirm('');
                    setPinError(null);
                    setPinSuccess(null);
                  }}
                  className="h-9 px-3.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-semibold text-primary transition-colors"
                >
                  Change PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinModalType('reset');
                    setPinPassword('');
                    setPinNew('');
                    setPinConfirm('');
                    setPinError(null);
                    setPinSuccess(null);
                  }}
                  className="h-9 px-3 rounded-xl text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Forgot PIN?
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPinModalType('setup');
                  setPinNew('');
                  setPinConfirm('');
                  setPinError(null);
                  setPinSuccess(null);
                }}
                className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs transition-all"
              >
                Set Up PIN
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PIN Management Modal */}
      {pinModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-on-surface">
                  {pinModalType === 'setup'
                    ? 'Set Up Transfer PIN'
                    : pinModalType === 'change'
                    ? 'Change Transfer PIN'
                    : 'Reset Transfer PIN'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPinModalType(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pinError && (
              <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {pinSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pinSuccess}</span>
              </div>
            )}

            <form
              onSubmit={
                pinModalType === 'setup'
                  ? handleSetupPinSubmit
                  : pinModalType === 'change'
                  ? handleChangePinSubmit
                  : handleResetPinSubmit
              }
              className="space-y-3.5"
            >
              {pinModalType === 'change' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="pinCurrentInput">
                    Current 4-Digit PIN *
                  </label>
                  <input
                    id="pinCurrentInput"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinCurrent}
                    onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full h-11 px-3.5 text-center text-xl tracking-widest bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              {pinModalType === 'reset' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="pinPasswordInput">
                    Account Password (for verification) *
                  </label>
                  <input
                    id="pinPasswordInput"
                    type="password"
                    value={pinPassword}
                    onChange={(e) => setPinPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="pinNewInput">
                    {pinModalType === 'change' ? 'New 4-Digit PIN *' : '4-Digit PIN *'}
                  </label>
                  <input
                    id="pinNewInput"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinNew}
                    onChange={(e) => setPinNew(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full h-11 px-3.5 text-center text-xl tracking-widest bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="pinConfirmInput">
                    Confirm PIN *
                  </label>
                  <input
                    id="pinConfirmInput"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full h-11 px-3.5 text-center text-xl tracking-widest bg-surface-container-low rounded-xl text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinModalType(null)}
                  className="h-11 rounded-xl bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPinSubmitting || pinNew.length !== 4 || pinConfirm.length !== 4}
                  className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isPinSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Save PIN</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Prominent Bottom Sign Out Section */}
      <div className="pt-2">
        {!showSignOutConfirm ? (
          <button
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full h-12 rounded-xl border border-error/40 hover:bg-error-container/20 text-error font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99] shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <div className="p-4 rounded-xl border border-error/30 bg-error-container/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-on-surface">
              <LogOut className="w-4 h-4 text-error shrink-0" />
              <span className="text-xs sm:text-sm font-semibold">Sign out of Emprise Finance?</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="h-9 px-3.5 rounded-lg border border-outline-variant/40 text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="h-9 px-4 rounded-lg bg-error hover:bg-error/90 text-on-error text-xs font-bold transition-all shadow-xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
