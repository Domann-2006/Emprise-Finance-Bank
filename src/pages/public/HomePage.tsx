import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/common/Logo';
import { ForgotPasswordModal } from '../../components/common/ForgotPasswordModal';
import {
  APP_NAME,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
  ROUTING_NUMBER,
  WIRE_ROUTING_NUMBER,
  CURRENT_YEAR,
} from '../../config/brand';
import {
  Lock,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  CreditCard,
  PiggyBank,
  ArrowRightLeft,
  MapPin,
  TrendingUp,
  Headphones,
  CheckCircle2,
  ShieldCheck,
  Building,
  Phone,
  BadgeCheck,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { login, error, clearError, user, role, isFirebaseActive } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('elena.vance');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // If already logged in, show quick jump
  React.useEffect(() => {
    if (user && role) {
      if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username.trim() || !password) {
      setLocalError('Please enter both your username and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      if (result.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setLocalError(result.error || 'Invalid credentials.');
    }
  };

  const handleQuickFill = (u: string, p = 'password123') => {
    setUsername(u);
    setPassword(p);
    setLocalError(null);
    clearError();
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Top Public Header */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center">
            <Logo size="md" variant="dark" />
          </Link>

          <div className="flex items-center gap-3">
            <a
              href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{SUPPORT_PHONE_DISPLAY}</span>
            </a>

            <Link
              to="/signup"
              className="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Open Account</span>
            </Link>

            <a
              href="#login-card"
              className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs sm:text-sm transition-all"
            >
              Sign In
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 gap-8">
        {/* Firebase Environment Status Indicator */}
        {!isFirebaseActive && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-on-surface">
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="w-5 h-5 text-primary shrink-0" />
              <div>
                <strong className="font-semibold block text-on-surface">Interactive Preview & Testing Mode Active</strong>
                <span className="text-on-surface-variant">
                  Sample users are pre-configured. You can log in with one click below or register a new customer account.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleQuickFill('elena.vance')}
                className="px-2.5 py-1 rounded-lg bg-surface-container-lowest font-medium text-primary hover:bg-white shadow-xs"
              >
                Customer: Elena
              </button>
              <button
                onClick={() => handleQuickFill('admin')}
                className="px-2.5 py-1 rounded-lg bg-surface-container-lowest font-medium text-tertiary hover:bg-white shadow-xs"
              >
                Admin
              </button>
            </div>
          </div>
        )}

        {/* Hero & Login Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Hero Content */}
          <section className="lg:col-span-7 flex flex-col space-y-5">
            <div className="inline-flex items-center space-x-2 bg-secondary-container/40 self-start px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              <span className="text-xs font-semibold text-on-secondary-fixed-variant">
                Community-First Banking
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface leading-tight">
              Banking That Moves With You
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
              Your trusted local financial institution offering modern digital tools, real-time transfers, 24/7 client care, and complete fiscal security.
            </p>

            {/* Social Proof & Metrics Strip */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  EF
                </div>
                <div>
                  <div className="flex items-center gap-1 text-amber-500 text-sm">
                    <span>★★★★★</span>
                    <span className="font-bold text-on-surface text-xs ml-1">4.9 / 5.0</span>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium">
                    Verified Customer Satisfaction
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-primary block">$0.00</span>
                <span className="text-[11px] text-on-surface-variant">Monthly Checking Fee</span>
              </div>
            </div>

            {/* Quick Action Hero Jump Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link
                to="/signup"
                className="h-12 flex items-center justify-center bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Open Account</span>
              </Link>
              <a
                href="#login-card"
                className="h-12 flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In Below</span>
              </a>
            </div>

            {/* Trust highlights */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-xs text-on-surface-variant">
              <div className="p-3 bg-surface-container-low rounded-xl flex flex-col gap-1">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="font-semibold text-on-surface">Insured Accounts</span>
                <span className="text-[11px]">Up to legal maximum</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl flex flex-col gap-1">
                <Lock className="w-4 h-4 text-tertiary" />
                <span className="font-semibold text-on-surface">256-Bit SSL</span>
                <span className="text-[11px]">Bank-grade encryption</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl flex flex-col gap-1">
                <Building className="w-4 h-4 text-secondary" />
                <span className="font-semibold text-on-surface">Chartered Bank</span>
                <span className="text-[11px]">Community institution</span>
              </div>
            </div>
          </section>

          {/* Right Column: Interactive Login Card */}
          <div className="lg:col-span-5" id="login-card">
            <div className="bg-surface-container-lowest rounded-2xl shadow-md border border-outline-variant/30 p-6 flex flex-col space-y-5 relative overflow-hidden">
              {/* Top Accent Gradient */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-tertiary via-primary-container to-primary" />

              <div className="flex items-center justify-between pt-1">
                <div>
                  <h2 className="text-xl font-bold text-on-surface">Welcome Back</h2>
                  <p className="text-xs text-on-surface-variant">Sign in with your username and password</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-tertiary">
                  <Lock className="w-5 h-5" />
                </div>
              </div>

              {/* Error Banner State */}
              {(localError || error) && (
                <div className="bg-error-container text-on-error-container rounded-xl p-3 flex items-start gap-2.5 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Sign In Verification</p>
                    <p className="opacity-90">{localError || error}</p>
                  </div>
                  <button
                    onClick={() => {
                      setLocalError(null);
                      clearError();
                    }}
                    className="text-on-error-container/70 hover:text-on-error-container p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                {/* Username Input */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface" htmlFor="username">
                    Username / Member ID
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. elena.vance"
                      required
                      className="w-full h-12 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="password">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-xs text-tertiary font-semibold hover:underline"
                    >
                      Need help?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full h-12 pl-3.5 pr-11 bg-surface-container-low rounded-xl text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full mt-2 flex items-center justify-center bg-primary-container hover:bg-primary text-on-primary font-semibold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Log In to {APP_NAME}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sample User Quick-fill buttons */}
              <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-2">
                <span className="text-[11px] font-medium text-on-surface-variant text-center">
                  Quick-fill demo credentials:
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('elena.vance')}
                    className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-medium truncate"
                  >
                    Elena (Cust.)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin')}
                    className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-medium truncate"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('sarah.jenkins')}
                    className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-error text-[11px] font-medium truncate"
                    title="Test disabled account error"
                  >
                    Disabled User
                  </button>
                </div>
              </div>

              {/* Enrollment Link */}
              <div className="bg-surface-container-low rounded-xl p-3 text-center">
                <p className="text-xs text-on-surface-variant">
                  New to {APP_NAME}?{' '}
                  <Link to="/signup" className="text-tertiary font-semibold hover:underline">
                    Enroll / Open an account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Banking Services (2x3 Grid matching design) */}
        <section className="pt-4 flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-bold text-on-surface">Quick Banking Services</h3>
            <p className="text-xs text-on-surface-variant">Tap to start an instant request or application</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {/* Tile 1: Open Checking */}
            <Link
              to="/signup"
              className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-outline-variant/20 text-left flex flex-col justify-between hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-tertiary mb-3">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-sm text-on-surface block leading-tight">
                  Open Checking
                </span>
                <span className="text-xs text-primary font-medium mt-1 block">$0 monthly fee</span>
              </div>
            </Link>

            {/* Tile 2: Open Savings */}
            <Link
              to="/signup"
              className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-outline-variant/20 text-left flex flex-col justify-between hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-tertiary mb-3">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-sm text-on-surface block leading-tight">
                  Open Savings
                </span>
                <span className="text-xs text-primary font-medium mt-1 block">4.25% APY yield</span>
              </div>
            </Link>

            {/* Tile 3: Transfer Money */}
            <Link
              to="/transfer"
              className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-outline-variant/20 text-left flex flex-col justify-between hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-tertiary mb-3">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-sm text-on-surface block leading-tight">
                  Transfer Money
                </span>
                <span className="text-xs text-on-surface-variant mt-1 block">Instant network</span>
              </div>
            </Link>

            {/* Tile 4: Find Locations */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-outline-variant/20 text-left flex flex-col justify-between hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-tertiary mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-sm text-on-surface block leading-tight">
                  Find Locations
                </span>
                <span className="text-xs text-on-surface-variant mt-1 block">Branches & ATMs</span>
              </div>
            </div>

            {/* Tile 5: Check Rates */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-outline-variant/20 text-left flex flex-col justify-between hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-tertiary mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-sm text-on-surface block leading-tight">
                  Check Rates
                </span>
                <span className="text-xs text-on-surface-variant mt-1 block">Deposits & CDs</span>
              </div>
            </div>

            {/* Tile 6: Get Help */}
            <Link
              to="/support"
              className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-outline-variant/20 text-left flex flex-col justify-between hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-tertiary mb-3">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-sm text-on-surface block leading-tight">
                  Get Help
                </span>
                <span className="text-xs text-on-surface-variant mt-1 block">24/7 Client Care</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Informational Feature Promos */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-xs flex flex-col justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Local Impact</span>
              <h4 className="text-lg font-bold text-on-surface mt-1">Community Roots, Digital Power</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
                We reinvest deposits straight into community commerce. Enjoy personalized banking, free financial guidance, and access to thousands of fee-free ATMs nationwide.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
              <div className="bg-surface-container-low p-3 rounded-xl">
                <span className="text-base font-bold text-on-surface block">55,000+</span>
                <span className="text-[11px] text-on-surface-variant">Fee-free ATM network</span>
              </div>
              <div className="bg-surface-container-low p-3 rounded-xl">
                <span className="text-base font-bold text-primary block">$0 / mo</span>
                <span className="text-[11px] text-on-surface-variant">Community checking</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-xs flex flex-col justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-tertiary">Institutional Reliability</span>
              <h4 className="text-lg font-bold text-on-surface mt-1">Bank Securely Anywhere</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
                Rest easy with end-to-end 256-bit encryption, instant debit card locking, real-time transaction alerts, and dedicated compliance monitoring.
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t border-outline-variant/20">
              <div className="flex items-center gap-2 text-xs text-on-surface">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>Zero liability card lock controls</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-on-surface">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>Automatic 15-minute inactivity session termination</span>
              </div>
            </div>
          </div>
        </section>

        {/* Banking Footer */}
        <footer className="mt-8 pt-8 border-t border-outline-variant/30 flex flex-col gap-6 text-on-surface-variant">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Member Care Hotline</span>
              <a href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`} className="text-lg font-bold text-on-surface hover:text-primary transition-colors">
                {SUPPORT_PHONE_DISPLAY}
              </a>
              <span className="text-xs">Toll-free • Available 24 hours a day, 7 days a week</span>
            </div>

            <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20 flex flex-col justify-center gap-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span>Electronic Routing (ACH):</span>
                <span className="font-mono font-bold text-on-surface">{ROUTING_NUMBER}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Domestic Wire Routing:</span>
                <span className="font-mono font-bold text-on-surface">{WIRE_ROUTING_NUMBER}</span>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-1 text-xs">
              <span className="font-semibold text-on-surface">{APP_NAME} National Association</span>
              <span>120 Financial Plaza, Suite 400</span>
              <span>Chartered Community Financial Institution</span>
            </div>
          </div>

          <div className="text-center text-[11px] text-outline pt-4 border-t border-outline-variant/20 space-y-1">
            <p>© {CURRENT_YEAR} {APP_NAME}. All rights reserved.</p>
            <p>
              Online banking services provided by {APP_NAME}. Deposits are subject to standard account agreements and institutional policies.
            </p>
          </div>
        </footer>
      </main>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} />
    </div>
  );
};
