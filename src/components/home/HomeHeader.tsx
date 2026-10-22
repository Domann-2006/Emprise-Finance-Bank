import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { Menu, X, UserPlus, LogIn, Percent, MapPin, HelpCircle, Briefcase } from 'lucide-react';

interface HomeHeaderProps {
  onLoginClick: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ onLoginClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleMobileLinkClick = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  const navLinks = [
    { label: 'Rates', href: '#rates', icon: Percent },
    { label: 'Locations', href: '#locations', icon: MapPin },
    { label: 'Support', href: '/support', isRoute: true, icon: HelpCircle },
    { label: 'Careers', href: '#careers', icon: Briefcase },
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 pt-[env(safe-area-inset-top)] transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 min-h-[64px] flex items-center justify-between gap-3">
        {/* Logo (never wraps, shrink-0) */}
        <Link to="/" className="flex items-center shrink-0 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
          <Logo size="md" variant="dark" />
        </Link>

        {/* Desktop Navigation Links (lg+) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-on-surface-variant" aria-label="Main Navigation">
          {navLinks.map((item) =>
            item.isRoute ? (
              <Link
                key={item.label}
                to={item.href}
                className="hover:text-primary transition-colors focus:outline-none focus:underline"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="hover:text-primary transition-colors focus:outline-none focus:underline"
              >
                {item.label}
              </a>
            )
          )}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Desktop Open Account Button */}
          <Link
            to="/signup"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-tint text-on-primary font-semibold text-xs sm:text-sm shadow-xs transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Open Account</span>
          </Link>

          {/* Login Pill Button */}
          <button
            type="button"
            onClick={onLoginClick}
            aria-label="Scroll to sign in card"
            className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#cbeef0] hover:bg-[#b2eae5] text-[#071c36] font-bold text-xs uppercase tracking-wide transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
          >
            Login
          </button>

          {/* Mobile Hamburger Button (< lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Menu */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-label="Mobile Navigation Menu"
          className="lg:hidden border-t border-outline-variant/30 bg-surface-container-lowest shadow-xl animate-fade-in"
        >
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col space-y-2">
            <Link
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-xs active:scale-[0.99]"
            >
              <span className="flex items-center gap-2.5">
                <UserPlus className="w-4 h-4" />
                <span>Open Account</span>
              </span>
              <span className="text-xs font-normal opacity-90">Enroll in minutes</span>
            </Link>

            <button
              type="button"
              onClick={() => handleMobileLinkClick(onLoginClick)}
              className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-surface-container text-left text-sm font-semibold text-on-surface text-primary"
            >
              <LogIn className="w-4 h-4 text-primary" />
              <span>Sign In to Your Account</span>
            </button>

            <div className="h-px bg-outline-variant/20 my-1" />

            {navLinks.map((item) => {
              const Icon = item.icon;
              return item.isRoute ? (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-surface-container text-sm font-medium text-on-surface"
                >
                  <Icon className="w-4 h-4 text-secondary" />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-surface-container text-sm font-medium text-on-surface"
                >
                  <Icon className="w-4 h-4 text-secondary" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
