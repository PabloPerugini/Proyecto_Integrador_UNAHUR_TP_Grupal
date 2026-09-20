import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PageLoader from './PageLoader';

export default function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}