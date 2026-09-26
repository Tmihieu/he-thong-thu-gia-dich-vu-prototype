import { formatDate } from '../../shared/format';
import type { CollectorCharge } from './api';

export type ResultKind = 'CASH' | 'TRANSFER' | 'ABSENT' | 'APPOINTMENT' | 'REFUSED';

export const RESULT_LABELS: Record<ResultKind, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  ABSENT: 'Vắng nhà',
  APPOINTMENT: 'Hẹn lại',
  REFUSED: 'Từ chối nộp',
};

export type WorkGroup = 'UNPAID' | 'PAID' | 'APPOINTMENT' | 'ABSENT';

export const WORK_FILTERS: { value: WorkGroup | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'UNPAID', label: 'Chưa thu' },
  { value: 'PAID', label: 'Đã thu' },
  { value: 'APPOINTMENT', label: 'Hẹn' },
  { value: 'ABSENT', label: 'Vắng' },
];

/** Trạng thái hiển thị của một hộ: đã thu / miễn giảm theo khoản; chưa thu thì theo lượt ghé gần nhất. */
export function workState(w: CollectorCharge): { group: WorkGroup | null; label: string; color: string } {
  if (w.charge.status === 'PAID') return { group: 'PAID', label: 'Đã thu', color: 'green' };
  if (w.charge.status === 'EXEMPT') return { group: null, label: 'Miễn giảm', color: 'purple' };
  switch (w.lastVisit?.result) {
    case 'APPOINTMENT':
      return { group: 'APPOINTMENT', label: `Hẹn ${formatDate(w.lastVisit.revisitDate)}`, color: 'blue' };
    case 'ABSENT':
      return { group: 'ABSENT', label: 'Vắng nhà', color: 'gold' };
    case 'REFUSED':
      return { group: 'UNPAID', label: 'Từ chối nộp', color: 'red' };
    default:
      return w.charge.overdue
        ? { group: 'UNPAID', label: 'Quá hạn', color: 'red' }
        : { group: 'UNPAID', label: 'Chưa thu', color: 'orange' };
  }
}
