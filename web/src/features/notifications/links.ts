import type { Role } from '../../app/auth/authContext';
import { ROLE_BASE } from '../../app/layout/menuConfig';
import type { Notification } from './api';

type Params = Record<string, unknown>;

function withId(path: string, key: string, params: Params) {
  const id = params[key];
  return typeof id === 'number' && id > 0 ? `${path}${path.includes('?') ? '&' : '?'}id=${id}` : path;
}

/** `link.screen` do backend gửi → đường dẫn web. Thêm màn mới thì thêm vào đây. */
const SCREENS: Record<string, (p: Params) => string> = {
  'company.receipts': () => '/company/assigned?tab=receipts',
  'remittance.receiptIssues': () => '/commune/charges?tab=receipt-issues',
  'remittance.receipts': () => '/commune/charges?tab=receipts',
  'commune.complaints': (p) => withId('/commune/complaints', 'complaintId', p),
  'company.complaints': (p) => withId('/company/complaints', 'complaintId', p),
};

/** Đường dẫn tới màn của thông báo, hoặc null nếu màn không có hoặc thuộc vai trò khác. */
export function notificationPath(role: Role, link: Notification['link'] | null | undefined): string | null {
  const build = link ? SCREENS[link.screen] : undefined;
  if (!build) return null;
  const path = build(link!.params ?? {});
  return path.startsWith(`${ROLE_BASE[role]}/`) ? path : null;
}
