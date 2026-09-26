import type { NotificationKind } from './api';

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  REMINDER: 'Nhắc nộp',
  COMPLAINT: 'Khiếu nại',
  RECEIPT: 'Phiếu thu',
  INFO: 'Thông tin',
  TRANSACTION: 'Giao dịch',
};

export const NOTIFICATION_KIND_COLORS: Record<NotificationKind, string> = {
  REMINDER: 'red',
  COMPLAINT: 'purple',
  RECEIPT: 'blue',
  INFO: 'default',
  TRANSACTION: 'green',
};
