import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { api, ApiError, setTokenGetter, setUnauthorizedHandler } from '../../api/client';
import { AuthContext, type AuthState, type LoginResponse, type Me, readToken, writeToken } from './authContext';

setTokenGetter(readToken);

/** Lưu access token ở sessionStorage, nạp tài khoản qua /auth/me khi mở trang, xử lý 401 toàn cục. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<Me | null>(null);
  const [status, setStatus] = useState<AuthState['status']>(() => (readToken() ? 'loading' : 'anonymous'));

  const logout = useCallback(() => {
    writeToken(null);
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(() => {});
  }, [logout]);

  useEffect(() => {
    if (!readToken()) return;
    let cancelled = false;
    api
      .get<Me>('/api/platform/auth/me')
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 401 đã được unauthorizedHandler xử lý; lỗi khác (mất mạng) cũng coi như chưa đăng nhập.
        if (!(err instanceof ApiError && err.status === 401)) logout();
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<LoginResponse>('/api/platform/auth/login', { username, password });
    writeToken(res.accessToken);
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const value = useMemo<AuthState>(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
