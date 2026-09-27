import type { Href } from 'expo-router';

export interface NotificationLink {
  screen?: string;
  params?: Record<string, unknown> | null;
}

function positiveId(params: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = params?.[key];
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? String(value) : null;
}

/** `link.screen` do backend gửi (`ComplaintService`, `CitizenPaymentService`) → màn app; null nếu không có màn. */
export function notificationHref(link: NotificationLink | null | undefined): Href | null {
  switch (link?.screen) {
    case 'citizen.complaintDetail': {
      const id = positiveId(link.params, 'complaintId');
      return id ? { pathname: '/complaints/[id]', params: { id } } : '/complaints';
    }
    case 'citizen.paymentConfirmation': {
      const id = positiveId(link.params, 'paymentId');
      return id ? { pathname: '/confirmations/[id]', params: { id } } : '/confirmations';
    }
    default:
      return null;
  }
}
