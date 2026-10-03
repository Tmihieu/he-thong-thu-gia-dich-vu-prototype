import type { QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { isNetworkError } from './errors';

/**
 * Trạng thái "không tới được máy chủ" dùng chung cho thanh báo mất mạng: bật khi một truy vấn lỗi mạng,
 * tắt khi có truy vấn thành công. Không cần thư viện NetInfo (lockfile đang khóa, không cài thêm gói).
 */
let offline = false;
const listeners = new Set<() => void>();

function setOffline(value: boolean): void {
  if (offline === value) return;
  offline = value;
  listeners.forEach((l) => l());
}

export function useOffline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => offline,
    () => false,
  );
}

/** Gọi một lần ở gốc app; trả hàm hủy đăng ký. */
export function watchConnection(client: QueryClient): () => void {
  return client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    if (event.action.type === 'error') {
      if (isNetworkError(event.action.error)) setOffline(true);
    } else if (event.action.type === 'success') {
      setOffline(false);
    }
  });
}

/** Chỉ dùng trong test. */
export function resetConnectionState(): void {
  setOffline(false);
}
