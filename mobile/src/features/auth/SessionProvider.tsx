import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { setTokenGetter, setUnauthorizedHandler } from '../../api/client';
import { clearSession, loadSession, saveSession, type CitizenAccount, type StoredSession } from './storage';

interface SessionContextValue {
  /** null khi đang đọc phiên đã lưu lúc mở app. */
  isLoading: boolean;
  account: CitizenAccount | null;
  signIn: (session: StoredSession) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Giữ phiên đăng nhập người dân: token trong SecureStore, gắn vào `api` qua `setTokenGetter`;
 * gặp 401 (hết hạn / tài khoản bị khóa) thì tự đăng xuất để `Stack.Protected` đưa về màn đăng nhập.
 */
export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const tokenRef = useRef<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [account, setAccount] = useState<CitizenAccount | null>(null);

  const signOut = useCallback(async () => {
    tokenRef.current = null;
    setAccount(null);
    queryClient.clear();
    await clearSession();
  }, [queryClient]);

  const signIn = useCallback(
    async (session: StoredSession) => {
      tokenRef.current = session.accessToken;
      queryClient.clear();
      setAccount(session.account);
      await saveSession(session);
    },
    [queryClient],
  );

  useEffect(() => {
    setTokenGetter(() => tokenRef.current);
    setUnauthorizedHandler(() => {
      void signOut();
    });
  }, [signOut]);

  useEffect(() => {
    let cancelled = false;
    loadSession()
      .then((session) => {
        if (cancelled) return;
        if (session) {
          tokenRef.current = session.accessToken;
          setAccount(session.account);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ isLoading, account, signIn, signOut }), [isLoading, account, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession phải nằm trong <SessionProvider>');
  return value;
}
