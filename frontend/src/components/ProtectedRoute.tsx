import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/api/types';
import { Spinner } from './ui';

export default function ProtectedRoute({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (role && !hasRole(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
