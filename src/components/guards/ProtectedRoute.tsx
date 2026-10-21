import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, isLoading, role, status } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm font-medium text-on-surface-variant">Securing session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to home / login
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Account disabled or closed
  if (status === 'disabled' || status === 'closed') {
    return <Navigate to="/" state={{ error: `Account is ${status}. Access restricted.` }} replace />;
  }

  // If a specific role is required and user has different role
  if (allowedRole && role !== allowedRole) {
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
