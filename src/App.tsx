import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { isFirebaseConfigured, isMockEnabled } from './services/firebase';
import { FirebaseNotConfiguredScreen } from './components/common/FirebaseNotConfiguredScreen';
import { SessionTimeoutModal } from './components/common/SessionTimeoutModal';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { SignUpPage } from './pages/public/SignUpPage';

// Customer Pages
import { DashboardPage } from './pages/customer/DashboardPage';
import { TransferPage } from './pages/customer/TransferPage';
import { HistoryPage } from './pages/customer/HistoryPage';
import { SupportPage } from './pages/customer/SupportPage';
import { ProfilePage } from './pages/customer/ProfilePage';

// Admin Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminCreateAccountPage } from './pages/admin/AdminCreateAccountPage';
import { AdminTransactionsPage } from './pages/admin/AdminTransactionsPage';

// Smart Home Route: Redirects based on role if logged in
const RootRoute: React.FC = () => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm font-medium text-on-surface-variant">Loading Emprise Finance...</span>
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

        {/* Global 15-Minute Inactivity Session Timeout Modal */}
        <SessionTimeoutModal />
      </AuthProvider>
    </BrowserRouter>
  );
}
