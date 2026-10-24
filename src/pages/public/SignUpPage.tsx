import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/common/Logo';
import { SignUpFormData, AccountType } from '../../types';
import {
  APP_NAME,
  ROUTING_NUMBER,
  CURRENT_YEAR,
} from '../../config/brand';
import { maskAccountNumber } from '../../utils/format';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Lock,
  Shield,
  BadgeCheck,
  Calendar,
  AlertCircle,
  Home,
  CreditCard,
  PiggyBank,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import { useDraftState } from '../../hooks/useDraftState';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getFriendlyError, triggerOfflineShake } from '../../utils/errorMessages';

type SignUpSafeDraft = Omit<SignUpFormData, 'password' | 'govId'>;

export const SignUpPage: React.FC = () => {
  const { signUp, isFirebaseActive } = useAuth();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();

  const [draftData, setDraftData, clearSignUpDraft] = useDraftState<SignUpSafeDraft | null>(
    null,
    'signup_form',
    null
  );

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState<SignUpFormData>(() => ({
    firstName: draftData?.firstName || '',
    lastName: draftData?.lastName || '',
    dob: draftData?.dob || '',
    isOver18: draftData?.isOver18 ?? true,
    contactEmail: draftData?.contactEmail || '',
    phone: draftData?.phone || '',
    street: draftData?.street || '',
    apt: draftData?.apt || '',
    city: draftData?.city || '',
    state: draftData?.state || 'IL',
    zip: draftData?.zip || '',
    govId: '', // NEVER draft or persist govId
    username: draftData?.username || '',
    password: '', // NEVER draft or persist password
    accountType: draftData?.accountType || 'Checking',
    routingNumber: draftData?.routingNumber || ROUTING_NUMBER,
  }));

  // Sync non-sensitive form fields to debounced draft
  useEffect(() => {
    const { password, govId, ...safeDraft } = formData;
    setDraftData(safeDraft);
  }, [formData, setDraftData]);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccountNumber, setCreatedAccountNumber] = useState<string>('');
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Helper to calculate age from DOB
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Live password strength calculation
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-surface-container-highest' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-error' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-primary-container' };
  };

  const currentAge = calculateAge(formData.dob);
  const pwdStrength = getPasswordStrength(formData.password);

  const handleStep1Next = () => {
    setError(null);
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Please provide your legal first and last name.');
      return;
    }
    if (!formData.dob) {
      setError('Please enter your date of birth.');
      return;
    }
    if (currentAge < 18) {
      setError('You must be at least 18 years old to open an independent account.');
      return;
    }
    if (!formData.contactEmail.includes('@') || !formData.contactEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (formData.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setError(null);
    if (!formData.street.trim() || !formData.city.trim() || !formData.state.trim() || !formData.zip.trim()) {
      setError('Please fill in your full residential address (street, city, state, ZIP).');
      return;
    }
    if (!/^\d{5}/.test(formData.zip.trim())) {
      setError('Please enter a valid 5-digit ZIP code.');
      return;
    }
    setCurrentStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = formData.username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      setError('Username must be at least 3 alphanumeric characters.');
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(cleanUser)) {
      setError('Username may only contain letters, numbers, periods, and hyphens.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    const cleanRouting = (formData.routingNumber || ROUTING_NUMBER).trim();
    if (!/^\d{9}$/.test(cleanRouting)) {
      setError('Routing number must be exactly 9 numeric digits.');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      triggerOfflineShake();
      const friendly = getFriendlyError(new Error('offline'));
      setError(friendly.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUp(formData);
      if (result.success) {
        clearSignUpDraft();
        setCreatedAccountNumber(result.accountNumber);
        setCurrentStep(4); // Success step!
      } else {
        const friendly = getFriendlyError(result.error);
        setError(friendly.message);
      }
    } catch (err) {
      const friendly = getFriendlyError(err);
      setError(friendly.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAccountNumber = () => {
    navigator.clipboard.writeText(createdAccountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <Logo size="md" variant="dark" />
          </Link>

          <Link
            to="/"
            className="text-xs font-semibold text-on-surface-variant hover:text-on-surface flex items-center gap-1"
          >
            <span>Already enrolled? Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 py-8">
        {/* Step Indicator (Steps 1 to 3) */}
        {currentStep <= 3 && (
          <div className="flex flex-col gap-4 mb-6">
            <div className="text-center">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container/50 text-tertiary text-xs font-semibold mb-2">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Fast-Track Digital Enrollment</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Open Your Account</h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                Step {currentStep} of 3: {currentStep === 1 ? 'Personal Information' : currentStep === 2 ? 'Address & Verification' : 'Account Setup'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-on-surface">
                  {currentStep === 1 ? '33% completed' : currentStep === 2 ? '66% completed' : '90% completed'}
                </span>
                <span className="text-primary">Instant Decision</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary-container h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>

              {/* Step Badges */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-1 text-xs">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary font-semibold' : 'text-on-surface-variant opacity-60'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep >= 1 ? 'bg-primary-container text-on-primary' : 'bg-surface-container'}`}>
                    1
                  </div>
                  <span className="truncate">Personal</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary font-semibold' : 'text-on-surface-variant opacity-60'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep >= 2 ? 'bg-primary-container text-on-primary' : 'bg-surface-container'}`}>
                    2
                  </div>
                  <span className="truncate">Address</span>
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-primary font-semibold' : 'text-on-surface-variant opacity-60'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep >= 3 ? 'bg-primary-container text-on-primary' : 'bg-surface-container'}`}>
                    3
                  </div>
                  <span className="truncate">Account</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Error Notice */}
        {error && (
          <div className="mb-4 p-3.5 bg-error-container text-on-error-container rounded-xl flex items-start gap-2 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* ================= STEP 1: PERSONAL INFORMATION ================= */}
        {currentStep === 1 && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span>Personal Information</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                Step 1 of 3
              </span>
            </div>

            <div className="space-y-4">
              {/* Names row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="firstName">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Alex"
                    required
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="lastName">
                    Last Name *
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Rivera"
                    required
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                </div>
              </div>

              {/* Date of Birth & 18+ check */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="dob">
                    Date of Birth *
                  </label>
                  {formData.dob && (
                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${currentAge >= 18 ? 'text-primary' : 'text-error'}`}>
                      {currentAge >= 18 ? `Age: ${currentAge} yrs (Eligible)` : `Age: ${currentAge} yrs (Under 18)`}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    required
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span>Must be at least 18 years old to open an independent account</span>
                </p>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="contactEmail">
                  Contact Email Address *
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="name@example.com"
                  required
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                />
                <p className="text-[11px] text-on-surface-variant">
                  We use this address strictly for statement notifications and banking alerts.
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="phone">
                  Mobile Phone Number *
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 000-0000"
                  required
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-3">
              <Link
                to="/"
                onClick={() => clearSignUpDraft()}
                className="text-xs font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleStep1Next}
                className="h-11 px-6 bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center gap-1.5"
              >
                <span>Continue to Step 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: ADDRESS & GOV ID ================= */}
        {currentStep === 2 && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span>Residential Address & ID</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                Step 2 of 3
              </span>
            </div>

            <div className="space-y-4">
              {/* Street */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="street">
                  Street Address *
                </label>
                <input
                  id="street"
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="e.g. 780 S Wacker Dr"
                  required
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                />
              </div>

              {/* Suite / Apt */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="apt">
                  Apt, Suite, Building (Optional)
                </label>
                <input
                  id="apt"
                  type="text"
                  value={formData.apt}
                  onChange={(e) => setFormData({ ...formData, apt: e.target.value })}
                  placeholder="e.g. Apt 4B"
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                />
              </div>

              {/* City, State, ZIP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="city">
                    City *
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Chicago"
                    required
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="state">
                    State *
                  </label>
                  <input
                    id="state"
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    placeholder="IL"
                    required
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="zip">
                    ZIP Code *
                  </label>
                  <input
                    id="zip"
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    placeholder="60606"
                    required
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                </div>
              </div>

              {/* Gov ID Field - STRICTLY AS REQUESTED:
                  "For the "Gov ID" field, accept any made-up value, do NOT store it, and add helper text "Do not enter a real SSN"." */}
              <div className="space-y-1 p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                <label className="text-xs font-semibold text-on-surface block" htmlFor="govId">
                  Government ID / Tax ID Verification
                </label>
                <input
                  id="govId"
                  type="text"
                  value={formData.govId}
                  onChange={(e) => setFormData({ ...formData, govId: e.target.value })}
                  placeholder="e.g. 999-00-1234"
                  className="w-full h-11 px-3.5 bg-surface-container-lowest rounded-xl text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                />
                <p className="text-[11px] font-medium text-amber-700 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Do not enter a real SSN. Enter any test value (this is not stored).</span>
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="h-11 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm rounded-xl transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="h-11 px-6 bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center gap-1.5"
              >
                <span>Continue to Step 3</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: ACCOUNT SETUP ================= */}
        {currentStep === 3 && (
          <form onSubmit={handleFinalSubmit} className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span>Account Setup & Credentials</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                Step 3 of 3
              </span>
            </div>

            {/* Account Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface">Select Primary Account Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'Checking' })}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    formData.accountType === 'Checking'
                      ? 'border-primary-container bg-primary-container/10 ring-2 ring-primary-container/30'
                      : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    {formData.accountType === 'Checking' && (
                      <span className="w-2 h-2 rounded-full bg-primary-container" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-on-surface block">Community Checking</span>
                    <span className="text-xs text-primary font-medium mt-0.5 block">$0 Monthly Fee • Debit Included</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'Savings' })}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    formData.accountType === 'Savings'
                      ? 'border-primary-container bg-primary-container/10 ring-2 ring-primary-container/30'
                      : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <PiggyBank className="w-5 h-5 text-tertiary" />
                    {formData.accountType === 'Savings' && (
                      <span className="w-2 h-2 rounded-full bg-primary-container" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-on-surface block">High-Yield Savings</span>
                    <span className="text-xs text-tertiary font-medium mt-0.5 block">4.25% APY • Auto-Save</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Routing Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface" htmlFor="reg-routing">
                Electronic Routing Number (9 Digits) *
              </label>
              <input
                id="reg-routing"
                type="text"
                inputMode="numeric"
                maxLength={9}
                value={formData.routingNumber || ROUTING_NUMBER}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                  setFormData({ ...formData, routingNumber: val });
                }}
                placeholder={ROUTING_NUMBER}
                required
                className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
              />
              <p className="text-[11px] text-on-surface-variant">
                ABA Routing Number for ACH, direct deposit, and wire transfers.
              </p>
            </div>

            {/* Username & Password */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="reg-username">
                  Choose Username (Used for Login) *
                </label>
                <div className="relative">
                  <input
                    id="reg-username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="e.g. jvance"
                    required
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 lowercase"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Case-insensitive. You will log in using this username.
                </p>
              </div>

              {/* Password & Live Strength Meter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="reg-password">
                  Security Password *
                </label>
                <div className="relative flex items-center">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••••••"
                    required
                    className="w-full h-11 pl-3.5 pr-10 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password view"
                    className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-on-surface-variant">Strength:</span>
                    <div className="flex gap-1">
                      <div className={`w-6 h-1.5 rounded-full ${pwdStrength.score >= 1 ? pwdStrength.color : 'bg-surface-container-high'}`} />
                      <div className={`w-6 h-1.5 rounded-full ${pwdStrength.score >= 2 ? pwdStrength.color : 'bg-surface-container-high'}`} />
                      <div className={`w-6 h-1.5 rounded-full ${pwdStrength.score >= 3 ? pwdStrength.color : 'bg-surface-container-high'}`} />
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold ${pwdStrength.score >= 3 ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {pwdStrength.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="p-3 bg-surface-container-low rounded-xl flex items-start gap-2.5 text-xs text-on-surface-variant">
              <input
                id="agree"
                type="checkbox"
                required
                defaultChecked
                className="mt-0.5 rounded text-primary-container focus:ring-primary-container"
              />
              <label htmlFor="agree">
                I certify that I am at least 18 years old and agree to the {APP_NAME} Electronic Communications Disclosure and Member Account Agreement.
              </label>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="h-11 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm rounded-xl transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div
                onClick={() => {
                  if (!isOnline) triggerOfflineShake();
                }}
              >
                <button
                  type="submit"
                  disabled={isSubmitting || !isOnline}
                  className="h-11 px-6 bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Enrollment</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {!isOnline && (
              <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center font-medium">
                Connect to the internet to open an account.
              </p>
            )}
          </form>
        )}

        {/* ================= STEP 4: SUCCESS & APPROVAL SCREEN ================= */}
        {currentStep === 4 && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 border border-outline-variant/30 shadow-md flex flex-col gap-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                Instant Approval Confirmed
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">Welcome to {APP_NAME}!</h2>
              <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                Your new {formData.accountType} account has been created with a $0.00 opening balance and verified routing.
              </p>
            </div>

            {/* Generated Account Details Card */}
            <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 text-left space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="text-xs text-on-surface-variant font-medium">Account Holder</span>
                <span className="text-sm font-bold text-on-surface">{formData.firstName} {formData.lastName}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="text-xs text-on-surface-variant font-medium">Username / Member ID</span>
                <span className="text-sm font-mono font-bold text-primary">@{formData.username}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="text-xs text-on-surface-variant font-medium">Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-mono font-bold text-on-surface tracking-wider">
                    {createdAccountNumber}
                  </span>
                  <button
                    onClick={copyAccountNumber}
                    title="Copy Account Number"
                    className="p-1 rounded hover:bg-surface-container text-tertiary transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="text-xs text-on-surface-variant font-medium">Electronic Routing (ACH)</span>
                <span className="text-sm font-mono font-bold text-on-surface">{formData.routingNumber || ROUTING_NUMBER}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">Opening Balance</span>
                <span className="text-base font-bold text-emerald-600">$0.00 USD</span>
              </div>
            </div>

            {copiedAccount && (
              <span className="text-xs font-semibold text-primary animate-fade-in">
                Account number copied to clipboard!
              </span>
            )}

            <div className="pt-2 flex flex-col gap-3">
              <Link
                to="/"
                className="w-full h-12 bg-primary-container hover:bg-primary text-on-primary font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
