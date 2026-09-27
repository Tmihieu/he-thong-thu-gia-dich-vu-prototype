import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { components } from '../../api/schema';

export type CitizenAccount = components['schemas']['CitizenAccountDto'];

export interface StoredSession {
  accessToken: string;
  expiresAt: string;
  account: CitizenAccount;
}

const KEY = 'vsmt.citizen.session';

/** SecureStore trên điện thoại (G10); `expo start --web` không có SecureStore nên dùng localStorage để không vỡ. */
async function read(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

async function write(value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (value === null) globalThis.localStorage?.removeItem(KEY);
      else globalThis.localStorage?.setItem(KEY, value);
    } catch {
      // trình duyệt chặn lưu trữ: phiên chỉ sống trong bộ nhớ
    }
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, value);
}

export async function loadSession(now: () => number = Date.now): Promise<StoredSession | null> {
  const raw = await read();
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as StoredSession;
    if (!session.accessToken || !session.account || Date.parse(session.expiresAt) <= now()) {
      await write(null);
      return null;
    }
    return session;
  } catch {
    await write(null);
    return null;
  }
}

export function saveSession(session: StoredSession): Promise<void> {
  return write(JSON.stringify(session));
}

export function clearSession(): Promise<void> {
  return write(null);
}
