import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import {
  ShieldAlert,
  Users,
  UserPlus,
  Receipt,
  LogOut,
  Bell,
  Activity,
  Layers,
} from 'lucide-react';
import { APP_NAME } from '../../config/brand';
import { ConnectionBanner } from '../common/ConnectionBanner';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Overview', path: '/admin', icon: Layers },
    { name: 'Customers', path: '/admin/customers', icon: Users },
    { name: 'Create Account', path: '/admin/create-account', icon: UserPlus },
    { name: 'All Ledger', path: '/admin/transactions', icon: Receipt },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface">
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 bg-on-tertiary-fixed text-on-primary fixed inset-y-0 left-0 z-30">
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
          <NavLink to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white">{APP_NAME}</span>
              <span className="text-[10px] font-bold text-primary-fixed uppercase tracking-wider">
                Admin Console
              </span>
            </div>
          </NavLink>
        </div>

        {/* System Active Strip */}
        <div className="px-6 py-3 bg-black/20 flex items-center gap-2 border-b border-white/10 text-xs text-secondary-fixed-dim">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container" />
          </span>
          <span className="truncate">Ledger Engine Online</span>
        </div>

        {/* Navigation */}
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
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                    : 'text-secondary-fixed-dim hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Admin User Card & Sign Out */}
        <div className="p-4 border-t border-white/10 bg-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</span>
              <span className="text-[10px] text-secondary-fixed-dim truncate">Super Admin Role</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            aria-label="Sign Out"
            title="Sign Out"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary-fixed-dim hover:text-error transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ================= MOBILE HEADER (< lg) ================= */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-on-tertiary-fixed text-on-primary shadow-md pt-safe">
        <div className="h-16 px-4 flex items-center justify-between gap-2">
          <NavLink to="/admin" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white truncate">{APP_NAME}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary/40 text-primary-fixed text-[9px] font-bold">
                  ADMIN
                </span>
              </div>
              <span className="text-[11px] text-secondary-fixed-dim truncate">
                {navItems.find((i) => i.path === location.pathname)?.name || 'Admin'}
              </span>
            </div>
          </NavLink>

          <button
            onClick={handleSignOut}
            aria-label="Sign Out"
            className="px-2.5 py-1 rounded-lg bg-white/10 text-secondary-fixed-dim hover:text-white text-xs font-medium flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Connection status banner fixed under header */}
      <ConnectionBanner topOffsetClass="top-16 lg:left-64 xl:left-72" />

      {/* ================= MAIN CONTENT VIEWPORT ================= */}
      <div className="flex-1 lg:pl-64 xl:pl-72 flex flex-col min-h-screen">
        {/* Top desktop system bar */}
        <header className="hidden lg:flex h-16 px-8 items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Centralized Bank Command Center
            </span>
            <span className="text-outline-variant">•</span>
            <span className="text-xs text-on-surface-variant">
              Live Audit & Customer Ledger Control
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Real-Time Transactions Active</span>
            </span>
          </div>
        </header>

        <main className="flex-1 pt-16 lg:pt-0 pb-24 lg:pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 pb-safe shadow-[0_-4px_16px_rgba(7,28,54,0.06)]"
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
