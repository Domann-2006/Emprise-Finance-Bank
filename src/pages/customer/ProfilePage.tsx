import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCustomerAccount } from '../../services/banking';
import { BankAccount } from '../../types';
import { formatDateTime, maskAccountNumber } from '../../utils/format';
import { UserStatusBadge } from '../../components/common/StatusBadge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { PhotoViewerModal } from '../../components/common/PhotoViewerModal';
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
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import { BiometricSettingsCard } from '../../components/profile/BiometricSettingsCard';
import { isWeakPin } from '../../utils/pin';
import { useDraftState } from '../../hooks/useDraftState';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getFriendlyError, withTimeout, triggerOfflineShake } from '../../utils/errorMessages';
import { ErrorState } from '../../components/common/ErrorState';

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
  const { isOnline } = useOnlineStatus();
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [accountLoadError, setAccountLoadError] = useState<{ title: string; message: string } | null>(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Profile Photo State
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [pendingPhotoDataUrl, setPendingPhotoDataUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const photoMenuRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State with draft persistence
  const [email, setEmail, clearEmailDraft] = useDraftState(user?.uid, 'profile_email', user?.email || '');
  const [phone, setPhone, clearPhoneDraft] = useDraftState(user?.uid, 'profile_phone', user?.phone || '');
  const [routingNumber, setRoutingNumber, clearRoutingNumberDraft] = useDraftState(
    user?.uid,
    'profile_routing',
    user?.routingNumber || ROUTING_NUMBER
  );
  const [street, setStreet, clearStreetDraft] = useDraftState(user?.uid, 'profile_street', user?.address?.street || '');
  const [apt, setApt, clearAptDraft] = useDraftState(user?.uid, 'profile_apt', user?.address?.apt || '');
  const [city, setCity, clearCityDraft] = useDraftState(user?.uid, 'profile_city', user?.address?.city || '');
  const [state, setState, clearStateDraft] = useDraftState(user?.uid, 'profile_state', user?.address?.state || '');
  const [zip, setZip, clearZipDraft] = useDraftState(user?.uid, 'profile_zip', user?.address?.zip || '');

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    phone?: string;
    routingNumber?: string;
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
    setRoutingNumber(user?.routingNumber || ROUTING_NUMBER);
    setStreet(user?.address?.street || '');
    setApt(user?.address?.apt || '');
    setCity(user?.address?.city || '');
    setState(user?.address?.state || '');
    setZip(user?.address?.zip || '');
    clearEmailDraft();
    clearPhoneDraft();
    clearRoutingNumberDraft();
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
      setRoutingNumber(user.routingNumber || ROUTING_NUMBER);
      setStreet(user.address?.street || '');
      setApt(user.address?.apt || '');
      setCity(user.address?.city || '');
      setState(user.address?.state || '');
      setZip(user.address?.zip || '');
    }
  }, [user]);

  // Close photo dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
        setPhotoMenuOpen(false);
      }
    };
    if (photoMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [photoMenuOpen]);

  const loadAccount = async () => {
    if (!user) return;
    setAccountLoadError(null);
    try {
      const acct = await withTimeout(getCustomerAccount(user.uid), 10000);
      setAccount(acct);
    } catch (err) {
      setAccountLoadError(getFriendlyError(err));
    }
  };

  useEffect(() => {
    loadAccount();
  }, [user]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError(null);

    // Accept JPEG, PNG and WebP only
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const hasValidExt = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !hasValidExt) {
      setPhotoError('Invalid image format. Please select a JPEG, PNG, or WebP photo.');
      return;
    }

    // Reject files over 10 MB with a friendly message
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image file is too large. Please select a photo under 10 MB.');
      return;
    }

    setIsProcessingPhoto(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setPhotoError('Failed to read image file. Please try again.');
      setIsProcessingPhoto(false);
    };
    reader.onload = (readEv) => {
      const img = new Image();
      img.onerror = () => {
        setPhotoError('Unable to load image. Please select a valid picture.');
        setIsProcessingPhoto(false);
      };
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context unavailable.');
          }

          // Center-crop square
          const minDim = Math.min(img.naturalWidth, img.naturalHeight);
          const sx = (img.naturalWidth - minDim) / 2;
          const sy = (img.naturalHeight - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 512, 512);

          const getByteSize = (url: string) => {
            const base64Part = url.split(',')[1] || '';
            return Math.floor((base64Part.length * 3) / 4);
          };

          // Export as JPEG at quality 0.85
          let dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          // If the data URL is over 250 KB, re-export at quality 0.70
          if (getByteSize(dataUrl) > 250 * 1024) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.70);
          }

          // If still over 250 KB, re-export at quality 0.55
          if (getByteSize(dataUrl) > 250 * 1024) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.55);
          }

          setPendingPhotoDataUrl(dataUrl);
          setShowPhotoPreview(true);
        } catch (err: any) {
          setPhotoError(err.message || 'Error processing image.');
        } finally {
          setIsProcessingPhoto(false);
        }
      };
      img.src = readEv.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!pendingPhotoDataUrl) return;
    setIsSavingPhoto(true);
    setPhotoError(null);
    try {
      const res = await updateProfile({ photoDataUrl: pendingPhotoDataUrl });
      if (res.success) {
        setShowPhotoPreview(false);
        setPendingPhotoDataUrl(null);
        setProfileSuccess('Profile photo updated');
        setTimeout(() => setProfileSuccess(null), 4000);
      } else {
        setPhotoError(res.error || 'Failed to save profile photo.');
      }
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to save profile photo.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoError(null);
    setIsSavingPhoto(true);
    try {
      const res = await updateProfile({ photoDataUrl: '' });
      if (res.success) {
        setProfileSuccess('Profile updated');
        setTimeout(() => setProfileSuccess(null), 4000);
      } else {
        setPhotoError(res.error || 'Failed to remove profile photo.');
      }
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to remove profile photo.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      triggerOfflineShake();
      setProfileError('Connect to the internet to save changes.');
      return;
    }

    const errs: typeof fieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanRouting = routingNumber.trim();
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

    if (!cleanRouting) {
      errs.routingNumber = 'Routing number is required.';
    } else if (!/^\d{9}$/.test(cleanRouting)) {
      errs.routingNumber = 'Routing number must be exactly 9 digits.';
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
      routingNumber: cleanRouting,
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
      clearRoutingNumberDraft();
      clearStreetDraft();
      clearAptDraft();
      clearCityDraft();
      clearStateDraft();
      clearZipDraft();
      setProfileSuccess('Profile updated');
      setIsEditing(false);
      setTimeout(() => {
        setProfileSuccess(null);
      }, 4000);
    } else {
      const friendly = getFriendlyError(res.error);
      setProfileError(friendly.message);
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
      setPinSuccess('Transfer PIN updated. Biometric payment was turned off because your PIN changed. Turn it on again in Security.');
      setTimeout(() => {
        setPinModalType(null);
        setPinCurrent('');
        setPinNew('');
        setPinConfirm('');
        setPinSuccess(null);
      }, 2500);
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
      setPinSuccess('Transfer PIN reset. Biometric payment was turned off because your PIN changed. Turn it on again in Security.');
      setTimeout(() => {
        setPinModalType(null);
        setPinPassword('');
        setPinNew('');
        setPinConfirm('');
        setPinSuccess(null);
      }, 2500);
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

      {/* Account Load Error State */}
      {accountLoadError && !account && (
        <ErrorState
          title={accountLoadError.title}
          message={accountLoadError.message}
          onRetry={loadAccount}
        />
      )}

      {/* Profile Overview Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-5">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative" ref={photoMenuRef}>
              <button
                type="button"
                onClick={() => setPhotoMenuOpen((prev) => !prev)}
                className="relative group focus:outline-none rounded-2xl block"
                aria-label="Change profile photo"
                title="Change profile photo"
              >
                <UserAvatar
                  user={user}
                  size="xl"
                  className="w-14 h-14"
                  roundedClassName="rounded-2xl"
                />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md ring-2 ring-surface-container-lowest group-hover:scale-110 transition-transform">
                  <Camera className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={uploadInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelected}
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                onChange={handleFileSelected}
                className="hidden"
              />

              {/* Photo Menu Dropdown */}
              {photoMenuOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-2 w-48 rounded-xl bg-surface-container-lowest text-on-surface shadow-xl border border-outline-variant/30 py-1.5 z-30 animate-fade-in"
                >
                  {Boolean(user?.photoDataUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoMenuOpen(false);
                        setShowPhotoViewer(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-surface-container flex items-center gap-2 transition-colors text-on-surface"
                    >
                      <Eye className="w-4 h-4 text-primary shrink-0" />
                      <span>View photo</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      uploadInputRef.current?.click();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-surface-container flex items-center gap-2 transition-colors text-on-surface"
                  >
                    <Upload className="w-4 h-4 text-primary shrink-0" />
                    <span>{user?.photoDataUrl ? 'Upload new photo' : 'Upload photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      cameraInputRef.current?.click();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-surface-container flex items-center gap-2 transition-colors text-on-surface"
                  >
                    <Camera className="w-4 h-4 text-tertiary shrink-0" />
                    <span>Take photo</span>
                  </button>

                  {Boolean(user?.photoDataUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoMenuOpen(false);
                        handleRemovePhoto();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-error hover:bg-error-container/20 flex items-center gap-2 transition-colors border-t border-outline-variant/20 mt-1"
                    >
                      <Trash2 className="w-4 h-4 text-error shrink-0" />
                      <span>Remove photo</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-on-surface break-words">{user?.name}</h2>
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
                <div
                  onClick={() => {
                    if (!isOnline) triggerOfflineShake();
                  }}
                >
                  <button
                    type="button"
                    disabled={isSaving || !isOnline}
                    onClick={handleSaveProfile}
                    className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Notifications for Profile */}
        {photoError && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span>{photoError}</span>
          </div>
        )}

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

        {/* Read-Only Account Credentials and Editable Routing */}
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
              <label htmlFor="profileRouting" className="text-on-surface-variant font-medium">
                Electronic Routing
              </label>
            </div>
            {isEditing ? (
              <div className="space-y-1">
                <input
                  id="profileRouting"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={routingNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setRoutingNumber(val);
                    if (fieldErrors.routingNumber) setFieldErrors((p) => ({ ...p, routingNumber: undefined }));
                  }}
                  disabled={isSaving}
                  placeholder={ROUTING_NUMBER}
                  className={`w-full h-9 px-3 bg-surface-container-lowest rounded-lg text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 border transition-colors ${
                    fieldErrors.routingNumber ? 'border-error ring-1 ring-error/20' : 'border-outline-variant/30'
                  }`}
                />
                {fieldErrors.routingNumber && (
                  <p className="text-xs text-error font-medium">{fieldErrors.routingNumber}</p>
                )}
                <span className="text-[11px] text-on-surface-variant block">ACH / Direct Deposit</span>
              </div>
            ) : (
              <>
                <span className="text-sm font-bold text-on-surface font-mono block">
                  {user?.routingNumber || ROUTING_NUMBER}
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5 block">ACH / Direct Deposit</span>
              </>
            )}
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
              <div
                onClick={() => {
                  if (!isOnline) triggerOfflineShake();
                }}
              >
                <button
                  type="submit"
                  disabled={isSaving || !isOnline}
                  className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>

            {!isOnline && (
              <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center font-medium">
                Connect to the internet to save changes.
              </p>
            )}
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

      {/* Biometric Authentication Settings Card */}
      {user && <BiometricSettingsCard user={user} />}

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

      {/* Profile Photo Preview Modal */}
      {showPhotoPreview && pendingPhotoDataUrl &&
        ReactDOM.createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Preview profile photo"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          >
            <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm w-full border border-outline-variant/30 shadow-2xl flex flex-col gap-4 text-center max-h-[92vh] overflow-y-auto">
              <div>
                <h3 className="text-base font-bold text-on-surface">Preview Profile Photo</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Preview. Your photo is not saved until you tap Save photo.
                </p>
              </div>

              {/* Previews: Full square image + Small circle avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-full max-w-[18rem] aspect-square rounded-2xl overflow-hidden border border-outline-variant/30 shadow-md bg-surface-container-low">
                  <img
                    src={pendingPhotoDataUrl}
                    alt="Full square preview"
                    className="w-full h-full aspect-square object-cover rounded-2xl"
                  />
                </div>

                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/20">
                  <img
                    src={pendingPhotoDataUrl}
                    alt="Avatar circle preview"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30"
                  />
                  <span className="text-[11px] font-medium text-on-surface-variant">
                    Header avatar preview
                  </span>
                </div>
              </div>

              {photoError && (
                <p className="text-xs text-error font-medium">{photoError}</p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSavingPhoto}
                  onClick={handleSavePhoto}
                  className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPhoto ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save photo</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSavingPhoto}
                    onClick={() => {
                      uploadInputRef.current?.click();
                    }}
                    className="h-9 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-semibold text-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose different</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingPhoto}
                    onClick={() => {
                      setShowPhotoPreview(false);
                      setPendingPhotoDataUrl(null);
                      setPhotoError(null);
                    }}
                    className="h-9 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-xs font-semibold text-on-surface-variant transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Processing Photo Spinner */}
      {isProcessingPhoto &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <div className="bg-surface-container-lowest px-5 py-4 rounded-2xl border border-outline-variant/30 shadow-xl flex items-center gap-3 text-xs font-semibold text-on-surface">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span>Processing photo...</span>
            </div>
          </div>,
          document.body
        )}

      {/* Full-Screen Photo Viewer */}
      <PhotoViewerModal
        isOpen={showPhotoViewer}
        onClose={() => setShowPhotoViewer(false)}
        photoUrl={user?.photoDataUrl}
        userName={user?.name}
      />
    </div>
  );
};
