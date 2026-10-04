import type { semantic } from '../../app/theme';
import type { CollectorCharge } from './api';

type Tone = keyof typeof semantic;

/** Hộ chỉ Đã thu / Chưa thu (BR-COL-03). */
export type WorkGroup = 'UNPAID' | 'PAID';

/** Nút lọc danh sách hộ (như prototype): chưa thu mà quá hạn tách riêng "Quá hạn". */
export type WorkChip = 'ALL' | 'UNPAID' | 'OVERDUE' | 'PAID';
export const WORK_CHIPS: { value: WorkChip; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'UNPAID', label: 'Chưa thu' },
  { value: 'OVERDUE', label: 'Quá hạn' },
  { value: 'PAID', label: 'Đã thu' },
];
/** Thứ tự hiển thị: quá hạn trên cùng, đã thu xuống cuối, miễn giảm sau cùng. */
const CHIP_ORDER: Record<string, number> = { OVERDUE: 0, UNPAID: 1, PAID: 2 };

/** Nút lọc của một hộ; miễn giảm không vào nhóm nào. */
export function workChip(w: CollectorCharge): WorkChip | null {
  const g = workState(w).group;
  return g === 'UNPAID' && w.charge.overdue ? 'OVERDUE' : g;
}

/** Hộ có thuộc nút lọc không: "Chưa thu" gồm cả quá hạn, "Quá hạn" là tập con của "Chưa thu". */
export function matchesChip(w: CollectorCharge, chip: WorkChip): boolean {
  if (chip === 'ALL') return true;
  const unpaid = w.charge.status === 'UNPAID';
  if (chip === 'UNPAID') return unpaid;
  if (chip === 'OVERDUE') return unpaid && w.charge.overdue;
  return workState(w).group === chip;
}

export function countChips(items: CollectorCharge[]): Record<string, number> {
  return Object.fromEntries(WORK_CHIPS.map((c) => [c.value, items.filter((w) => matchesChip(w, c.value)).length]));
}

export function byChipOrder(a: CollectorCharge, b: CollectorCharge) {
  return (CHIP_ORDER[workChip(a) ?? ''] ?? 3) - (CHIP_ORDER[workChip(b) ?? ''] ?? 3) || a.charge.subjectCode.localeCompare(b.charge.subjectCode);
}

/** Trạng thái hiển thị của một hộ theo khoản: đã thu / chưa thu (quá hạn) / miễn giảm / đã xóa nợ. */
export function workState(w: CollectorCharge): { group: WorkGroup | null; label: string; tone: Tone } {
  if (w.charge.status === 'PAID') return { group: 'PAID', label: 'Đã thu', tone: 'success' };
  if (w.charge.status === 'EXEMPT') return { group: null, label: 'Miễn giảm', tone: 'neutral' };
  if (w.charge.status === 'WRITTEN_OFF') return { group: null, label: 'Đã xóa nợ', tone: 'neutral' };
  return w.charge.overdue
    ? { group: 'UNPAID', label: 'Quá hạn', tone: 'danger' }
    : { group: 'UNPAID', label: 'Chưa thu', tone: 'warning' };
}
