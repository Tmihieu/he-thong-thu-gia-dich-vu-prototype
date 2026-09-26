import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type Notification = components['schemas']['NotificationDto'];
export type NotificationPage = components['schemas']['NotificationPageDto'];
export type NotificationKind = Notification['kind'];

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread-count'] as const,
  list: ['notifications', 'list'] as const,
};

/** Kiểm tra số chưa đọc mỗi 30 giây (T33). */
export const POLL_MS = 30_000;

export interface NotificationQuery {
  kind?: NotificationKind;
  unreadOnly?: boolean;
  page: number;
  size: number;
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => api.get<{ unreadCount: number }>('/api/notifications/unread-count'),
    refetchInterval: POLL_MS,
  });
}

export function useNotifications(q: NotificationQuery, enabled = true) {
  return useQuery({
    queryKey: [...notificationKeys.list, q],
    queryFn: () =>
      api.get<NotificationPage>('/api/notifications', {
        params: { kind: q.kind, unreadOnly: q.unreadOnly || undefined, page: q.page, size: q.size },
      }),
    enabled,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<Notification>(`/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ unreadCount: number }>('/api/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
