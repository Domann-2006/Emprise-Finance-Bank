import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { isFirebaseConfigured, isMockEnabled } from './services/firebase';
import { FirebaseNotConfiguredScreen } from './components/common/FirebaseNotConfiguredScreen';
import { SessionTimeoutModal } from './components/common/SessionTimeoutModal';

// Public Pages (HomePage eager, SignUpPage lazy)
import { HomePage } from './pages/public/HomePage';
const SignUpPage = React.lazy(() => import('./pages/public/SignUpPage').then(m => ({ default: m.SignUpPage })));

// Customer Pages (Lazy loaded)
const DashboardPage = React.lazy(() => import('./pages/customer/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TransferPage = React.lazy(() => import('./pages/customer/TransferPage').then(m => ({ default: m.TransferPage })));
const HistoryPage = React.lazy(() => import('./pages/customer/HistoryPage').then(m => ({ default: m.HistoryPage })));
const SupportPage = React.lazy(() => import('./pages/customer/SupportPage').then(m => ({ default: m.SupportPage })));
const ProfilePage = React.lazy(() => import('./pages/customer/ProfilePage').then(m => ({ default: m.ProfilePage })));

// Admin Pages (Lazy loaded)
const AdminOverviewPage = React.lazy(() => import('./pages/admin/AdminOverviewPage').then(m => ({ default: m.AdminOverviewPage })));
const AdminCustomersPage = React.lazy(() => import('./pages/admin/AdminCustomersPage').then(m => ({ default: m.AdminCustomersPage })));
const AdminCreateAccountPage = React.lazy(() => import('./pages/admin/AdminCreateAccountPage').then(m => ({ default: m.AdminCreateAccountPage })));
const AdminTransactionsPage = React.lazy(() => import('./pages/admin/AdminTransactionsPage').then(m => ({ default: m.AdminTransactionsPage })));

// Lightweight Route Suspense Fallback
const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

// Idle prefetch: customer pages for customer role, admin pages for admin role (never admin for customer)
const RolePrefetcher: React.FC = () => {
  const { role } = useAuth();

  React.useEffect(() => {
    if (!role) return;

    const prefetch = () => {
      if (role === 'customer') {
        import('./pages/customer/DashboardPage');
        import('./pages/customer/TransferPage');
        import('./pages/customer/HistoryPage');
        import('./pages/customer/SupportPage');
        import('./pages/customer/ProfilePage');
      } else if (role === 'admin') {
        import('./pages/admin/AdminOverviewPage');
        import('./pages/admin/AdminCustomersPage');
        import('./pages/admin/AdminCreateAccountPage');
        import('./pages/admin/AdminTransactionsPage');
      }
    };

    if ('requestIdleCallback' in window) {
      const handle = (window as unknown as { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number })
        .requestIdleCallback(prefetch, { timeout: 1500 });
      return () => {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle);
      };
    } else {
      const timer = setTimeout(prefetch, 500);
      return () => clearTimeout(timer);
    }
  }, [role]);

  return null;
};

// Smart Home Route: Redirects based on role if logged in
const RootRoute: React.FC = () => {
  const { user, role, isLoading } = useAuth();
  const [tookTooLong, setTookTooLong] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isLoading) {
      timer = setTimeout(() => {
        setTookTooLong(true);
      }, 10000);
    } else {
      setTookTooLong(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm font-medium text-on-surface-variant">Loading Emprise Finance...</span>
          {tookTooLong && (
            <div className="flex flex-col items-center gap-3 mt-2 animate-fade-in">
              <p className="text-xs text-on-surface-variant">This is taking longer than usual. Check your network.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (user && role) {
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <HomePage />;
};

export default function App() {
  if (!isFirebaseConfigured() && !isMockEnabled) {
    return <FirebaseNotConfiguredScreen />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <RolePrefetcher />
        <React.Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Customer Area (Protected, role="customer") */}
            <Route
              element={
                <ProtectedRoute allowedRole="customer">
                  <CustomerLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/transfer" element={<TransferPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Admin Area (Protected, role="admin") */}
            <Route
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/customers" element={<AdminCustomersPage />} />
              <Route path="/admin/create-account" element={<AdminCreateAccountPage />} />
              <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>

        {/* Global 15-Minute Inactivity Session Timeout Modal */}
        <SessionTimeoutModal />
      </AuthProvider>
    </BrowserRouter>
  );
}
