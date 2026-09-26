import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { ForbiddenPage, FullPageSpin } from '../pages/StatusPages';
import { type Role, useAuth } from './authContext';

/** Chưa đăng nhập → về /login (nhớ trang đang mở); sai vai trò → trang 403. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpin />;
  if (status === 'anonymous' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(user.role)) return <ForbiddenPage />;
  return <>{children}</>;
}
