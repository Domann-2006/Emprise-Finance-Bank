import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ReceiptText,
  HelpCircle,
  User,
  LogOut,
  Bell,
  ShieldCheck,
  PhoneCall,
  Menu,
  X,
} from 'lucide-react';
import { SUPPORT_PHONE, APP_NAME } from '../../config/brand';
import { UserStatusBadge } from '../common/StatusBadge';
import { ConnectionBanner } from '../common/ConnectionBanner';
import { UserAvatar } from '../common/UserAvatar';

export const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = React.useState(false);
  const avatarMenuRef = React.useRef<HTMLDivElement>(null);

  // Close avatar dropdown on outside click or Escape key
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAvatarMenuOpen(false);
      }
    };

    if (isAvatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAvatarMenuOpen]);

  // Close dropdown on navigation
  React.useEffect(() => {
    setIsAvatarMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transfer', path: '/transfer', icon: ArrowLeftRight },
    { name: 'History', path: '/history', icon: ReceiptText },
    { name: 'Support', path: '/support', icon: HelpCircle },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface">
      {/* ================= DESKTOP SIDEBAR (lg and above) ================= */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 bg-surface-container-lowest border-r border-outline-variant/30 fixed inset-y-0 left-0 z-30">
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center border-b border-outline-variant/20">
          <NavLink to="/dashboard" className="flex items-center">
            <Logo size="md" variant="dark" />
          </NavLink>
        </div>

        {/* Member Status Badge */}
        <div className="px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Member Status
            </span>
            {user?.status && <UserStatusBadge status={user.status} />}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-on-surface">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="font-medium truncate">{user?.name || 'Member'}</span>
          </div>
          <span className="text-[11px] text-on-surface-variant/80 font-mono">@{user?.username}</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-on-primary' : 'text-on-surface-variant'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Support Direct Line */}
        <div className="p-4 mx-4 mb-4 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-primary font-semibold">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>24/7 Member Care</span>
          </div>
          <span className="font-mono text-on-surface font-medium">{SUPPORT_PHONE}</span>
        </div>

        {/* User Account Drawer / Sign Out */}
        <div className="p-4 border-t border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar user={user} size="sm" className="w-9 h-9" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface truncate">{user?.name}</span>
              <span className="text-[11px] text-on-surface-variant truncate">Client Portal</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            aria-label="Sign Out"
            title="Sign Out"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ================= MOBILE TOP HEADER (< lg) ================= */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-on-secondary-fixed text-on-secondary shadow-md pt-safe">
        <div className="h-16 px-4 flex items-center justify-between gap-2">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs shrink-0">
              EF
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-secondary-fixed-dim uppercase tracking-wider truncate">
                {APP_NAME}
              </span>
              <span className="text-sm font-bold text-on-secondary truncate">
                {navItems.find((i) => i.path === location.pathname)?.name || 'Dashboard'}
              </span>
            </div>
          </NavLink>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate('/support')}
              aria-label="Help & FAQ"
              className="w-10 h-10 flex items-center justify-center rounded-full text-secondary-fixed hover:bg-white/10 transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            {/* Mobile Avatar Menu Dropdown */}
            <div ref={avatarMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                aria-label="Account menu"
                aria-expanded={isAvatarMenuOpen}
                aria-haspopup="true"
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-secondary-fixed ring-offset-1 ring-offset-on-secondary-fixed"
              >
                <UserAvatar user={user} size="sm" className="w-8 h-8" />
              </button>

              {isAvatarMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-surface-container-lowest text-on-surface shadow-xl border border-outline-variant/30 py-2 z-50 animate-fade-in"
                >
                  {/* User info */}
                  <div className="px-4 py-2.5 border-b border-outline-variant/20 flex items-center gap-2.5">
                    <UserAvatar user={user} size="sm" className="w-8 h-8" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{user?.name || 'Member'}</p>
                      <p className="text-[11px] font-mono text-primary truncate">@{user?.username || 'user'}</p>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="py-1">
                    <NavLink
                      to="/profile"
                      onClick={() => setIsAvatarMenuOpen(false)}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors"
                    >
                      <User className="w-4 h-4 text-on-surface-variant shrink-0" />
                      <span>Profile</span>
                    </NavLink>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsAvatarMenuOpen(false);
                        await handleSignOut();
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-error hover:bg-error-container/20 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-error shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
 
      {/* Connection status banner fixed under header */}
      <ConnectionBanner topOffsetClass="top-16 lg:left-64 xl:left-72" />

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="flex-1 lg:pl-64 xl:pl-72 flex flex-col min-h-screen">
        {/* Desktop Top Bar (lg only) */}
        <header className="hidden lg:flex h-16 px-8 items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-secondary-fixed-dim uppercase tracking-wider">
              {APP_NAME} Secure Online Banking
            </span>
            <span className="text-outline-variant">•</span>
            <span className="text-xs text-on-surface-variant font-medium">
              Today is {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`}
              className="text-xs font-medium text-tertiary hover:underline flex items-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{SUPPORT_PHONE}</span>
            </a>
            <div className="h-4 w-px bg-outline-variant/40" />
            <button
              onClick={() => navigate('/support')}
              className="text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FAQ & Support</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 pt-16 lg:pt-0 pb-24 lg:pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION (< lg) ================= */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 pb-safe shadow-[0_-4px_16px_rgba(7,28,54,0.06)]"
        role="navigation"
      >
        <div className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 min-w-[56px] h-14 transition-colors ${
                  isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} />
                <span className="text-[10px] leading-tight">{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
