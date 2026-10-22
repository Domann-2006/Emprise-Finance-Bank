import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isMockEnabled } from '../../services/firebase';
import { ForgotPasswordModal } from '../../components/common/ForgotPasswordModal';
import { AlertBar } from '../../components/home/AlertBar';
import { HomeHeader } from '../../components/home/HomeHeader';
import { HeroSection } from '../../components/home/HeroSection';
import { LoginCard } from '../../components/home/LoginCard';
import { QuickActions } from '../../components/home/QuickActions';
import { FeatureStories } from '../../components/home/FeatureStories';
import { CommunityReportCard } from '../../components/home/CommunityReportCard';
import { CircularImageCards } from '../../components/home/CircularImageCards';
import { SecuritySection } from '../../components/home/SecuritySection';
import { HomeFooter } from '../../components/home/HomeFooter';
import { BadgeCheck } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { login, error, clearError, user, role, isFirebaseActive } = useAuth();
  const navigate = useNavigate();

  // Authentication & Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && role) {
      if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    }
  }, [user, role, navigate]);

  // Smooth scroll to login card and focus the username field
  const handleScrollToLogin = () => {
    const loginCardEl = document.getElementById('login');
    if (loginCardEl) {
      loginCardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 350);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username.trim() || !password) {
      setLocalError('Please enter both your username and password.');
      if (!password && username.trim()) {
        passwordInputRef.current?.focus();
      }
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
      setPassword('');
      setLocalError(result.error || 'Invalid credentials.');
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* 1. Dismissible Alert Bar (remembers dismissal in state only) */}
      {!isAlertDismissed && (
        <AlertBar onDismiss={() => setIsAlertDismissed(true)} />
      )}

      {/* 2. Sticky Glass Header with Inline Desktop Links & Mobile Hamburger */}
      <HomeHeader onLoginClick={handleScrollToLogin} />

      {/* Main Content Sections */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-12 space-y-16 sm:space-y-24">
        {/* Dev Mock Testing Indicator (strictly in DEV and VITE_USE_MOCK === "true") */}
        {!isFirebaseActive && isMockEnabled && Boolean(import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between text-xs text-on-surface shadow-xs">
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="w-5 h-5 text-primary shrink-0" />
              <div>
                <strong className="font-semibold block text-on-surface">Interactive Preview Mode Active</strong>
                <span className="text-on-surface-variant">
                  Mock sandbox enabled for local verification. Standard credentials and user registration are fully functional.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3 & 9. Hero Section with Full-Width Photo, Dark Overlay, and Desktop Side-by-Side Sign-In Card */}
        <HeroSection onSignInClick={handleScrollToLogin}>
          <LoginCard
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isSubmitting={isSubmitting}
            localError={localError}
            setLocalError={setLocalError}
            error={error}
            clearError={clearError}
            handleSubmit={handleSubmit}
            onForgotPasswordClick={() => setIsForgotPasswordOpen(true)}
            usernameInputRef={usernameInputRef}
            passwordInputRef={passwordInputRef}
          />
        </HeroSection>

        {/* 4. Quick-Action Icon Row (6 circular icon buttons, mobile snap-x, desktop 6-col) */}
        <QuickActions />

        {/* 5. Feature Story Cards (3 cards, heavily rounded corner, alternate layout on desktop) */}
        <FeatureStories />

        {/* 6. Annual Report / Highlights Card ("2026 Community Report") */}
        <CommunityReportCard />

        {/* 7. Three Circular-Image Cards ("Locations", "Meet a Banker", "Rates") */}
        <CircularImageCards />

        {/* 8. Security Section on Dark Navy Background with Subtle Image Overlay */}
        <SecuritySection />
      </main>

      {/* 10. Footer on Light Teal Background with Required Demo Disclaimer & Columns */}
      <HomeFooter />

      {/* Reusable Forgot Password Assistance Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};
