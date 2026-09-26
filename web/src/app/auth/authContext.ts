import { createContext, useContext } from 'react';

import type { components } from '../../api/schema';

export type Me = components['schemas']['MeResponse'];
export type LoginResponse = components['schemas']['LoginResponse'];
export type Role = Me['role'];

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthState {
  status: AuthStatus;
  user: Me | null;
  login: (username: string, password: string) => Promise<Me>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong AuthProvider');
  return ctx;
}

export const TOKEN_KEY = 'vsmt.accessToken';

export function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // trình duyệt chặn storage: token chỉ sống trong phiên hiện tại
  }
}
