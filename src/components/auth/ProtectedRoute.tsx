import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type AuthState } from '../../hooks/useAuth.js';

interface ProtectedRouteProps {
  allowedRoles: Array<'student' | 'lecturer' | 'admin'>;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const user = useAuth((state: AuthState) => state.user);

  if (!user) {
    // If not authenticated, redirect to the landing page.
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.includes(user.role)) {
    return children ? <>{children}</> : <Outlet />;
  }

  // If the user's role is not in the allowed list, redirect them to their own default page.
  const defaultPath =
    user.role === 'student'
      ? '/app/student'
      : user.role === 'admin'
        ? '/'
        : '/app/lecturer/management';
  return <Navigate to={defaultPath} replace />;
};
