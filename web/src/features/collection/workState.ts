import { formatDate } from '../../shared/format';
import type { semantic } from '../../app/theme';
import type { CollectorCharge } from './api';

type Tone = keyof typeof semantic;

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
/** BR-COL-04: giao diện người đi thu không có vắng / hẹn, nên không có nút lọc cho hai nhóm đó. */
export const COLLECTOR_CHIPS = WORK_CHIPS.filter((c) => c.value !== 'APPOINTMENT' && c.value !== 'ABSENT');
/** Thứ tự hiển thị: quá hạn trên cùng, đã thu xuống cuối, miễn giảm sau cùng. */
const CHIP_ORDER: Record<string, number> = { OVERDUE: 0, UNPAID: 1, ABSENT: 2, APPOINTMENT: 3, PAID: 4 };

/** Nút lọc của một hộ; miễn giảm không vào nhóm nào. */
export function workChip(w: CollectorCharge): WorkChip | null {
  const g = workState(w).group;
  return g === 'UNPAID' && w.charge.overdue ? 'OVERDUE' : g;
}

/** Hộ có thuộc nút lọc không: "Chưa thu" gồm cả quá hạn, "Quá hạn" là tập con của "Chưa thu". */
export function matchesChip(w: CollectorCharge, chip: WorkChip): boolean {
  if (chip === 'ALL') return true;
  const g = workState(w).group;
  if (chip === 'OVERDUE') return g === 'UNPAID' && w.charge.overdue;
  return g === chip;
}

export function countChips(items: CollectorCharge[]): Record<string, number> {
  return Object.fromEntries(WORK_CHIPS.map((c) => [c.value, items.filter((w) => matchesChip(w, c.value)).length]));
}

export function byChipOrder(a: CollectorCharge, b: CollectorCharge) {
  return (CHIP_ORDER[workChip(a) ?? ''] ?? 5) - (CHIP_ORDER[workChip(b) ?? ''] ?? 5) || a.charge.subjectCode.localeCompare(b.charge.subjectCode);
}

/** Trạng thái hiển thị của một hộ: đã thu / miễn giảm / đã xóa nợ theo khoản; chưa thu thì theo lượt ghé gần nhất. */
export function workState(w: CollectorCharge): { group: WorkGroup | null; label: string; tone: Tone } {
  if (w.charge.status === 'PAID') return { group: 'PAID', label: 'Đã thu', tone: 'success' };
  if (w.charge.status === 'EXEMPT') return { group: null, label: 'Miễn giảm', tone: 'neutral' };
  if (w.charge.status === 'WRITTEN_OFF') return { group: null, label: 'Đã xóa nợ', tone: 'neutral' };
  switch (w.lastVisit?.result) {
    case 'APPOINTMENT':
      return { group: 'APPOINTMENT', label: `Hẹn ${formatDate(w.lastVisit.revisitDate)}`, tone: 'info' };
    case 'ABSENT':
      return { group: 'ABSENT', label: 'Vắng nhà', tone: 'warning' };
    case 'REFUSED':
      return { group: 'UNPAID', label: 'Từ chối nộp', tone: 'danger' };
    default:
      return w.charge.overdue
        ? { group: 'UNPAID', label: 'Quá hạn', tone: 'danger' }
        : { group: 'UNPAID', label: 'Chưa thu', tone: 'warning' };
  }
}
