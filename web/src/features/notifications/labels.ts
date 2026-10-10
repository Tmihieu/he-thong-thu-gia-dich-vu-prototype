import type { NotificationKind } from './api';

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  REMINDER: 'Nhắc nộp',
  COMPLAINT: 'Khiếu nại',
  RECEIPT: 'Phiếu thu',
  INFO: 'Thông tin',
  TRANSACTION: 'Giao dịch',
};

export const NOTIFICATION_KIND_TONES: Record<NotificationKind, 'danger' | 'info' | 'neutral' | 'success'> = {
  REMINDER: 'danger',
  COMPLAINT: 'info',
  RECEIPT: 'info',
  INFO: 'neutral',
  TRANSACTION: 'success',
};
