import { useNavigate } from 'react-router';

import type { Role } from '../../app/auth/authContext';
import { type Notification, useMarkRead } from './api';
import { notificationPath } from './links';

/** Một dòng thông báo: bấm thì đánh dấu đã đọc và đi tới màn theo `link`. */
export function useOpenNotification(role: Role) {
  const navigate = useNavigate();
  const markRead = useMarkRead();
  return (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const path = notificationPath(role, n.link);
    if (path) void navigate(path);
  };
}
