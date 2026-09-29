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

/** Nút lọc danh sách hộ (như prototype): chưa thu mà quá hạn tách riêng "Quá hạn". */
export type WorkChip = 'ALL' | 'UNPAID' | 'OVERDUE' | 'APPOINTMENT' | 'ABSENT' | 'PAID';
export const WORK_CHIPS: { value: WorkChip; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'UNPAID', label: 'Chưa thu' },
  { value: 'OVERDUE', label: 'Quá hạn' },
  { value: 'APPOINTMENT', label: 'Đã hẹn' },
  { value: 'ABSENT', label: 'Vắng nhà' },
  { value: 'PAID', label: 'Đã thu' },
];
/** Thứ tự hiển thị: quá hạn trên cùng, đã thu xuống cuối, miễn giảm sau cùng. */
const CHIP_ORDER: Record<string, number> = { OVERDUE: 0, UNPAID: 1, ABSENT: 2, APPOINTMENT: 3, PAID: 4 };

/** Nút lọc của một hộ; miễn giảm không vào nhóm nào. */
export function workChip(w: CollectorCharge): WorkChip | null {
  const g = workState(w).group;
  return g === 'UNPAID' && w.charge.overdue ? 'OVERDUE' : g;
}

export function countChips(items: CollectorCharge[]): Record<string, number> {
  const c: Record<string, number> = { ALL: items.length };
  items.forEach((w) => {
    const k = workChip(w);
    if (k) c[k] = (c[k] ?? 0) + 1;
  });
  return c;
}

export function byChipOrder(a: CollectorCharge, b: CollectorCharge) {
  return (CHIP_ORDER[workChip(a) ?? ''] ?? 5) - (CHIP_ORDER[workChip(b) ?? ''] ?? 5) || a.charge.subjectCode.localeCompare(b.charge.subjectCode);
}

/** Trạng thái hiển thị của một hộ: đã thu / miễn giảm / đã xóa nợ theo khoản; chưa thu thì theo lượt ghé gần nhất. */
export function workState(w: CollectorCharge): { group: WorkGroup | null; label: string; color: string } {
  if (w.charge.status === 'PAID') return { group: 'PAID', label: 'Đã thu', color: 'green' };
  if (w.charge.status === 'EXEMPT') return { group: null, label: 'Miễn giảm', color: 'purple' };
  if (w.charge.status === 'WRITTEN_OFF') return { group: null, label: 'Đã xóa nợ', color: 'default' };
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
