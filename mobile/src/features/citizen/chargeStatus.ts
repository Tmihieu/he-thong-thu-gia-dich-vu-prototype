import { CHARGE_STATUS_LABELS } from '../../shared/labels';
import type { Tone } from '../../shared/theme';
import type { CitizenCharge } from './api';

type Status = Pick<CitizenCharge, 'status' | 'overdue'>;

/** Chưa thu quá hạn hiện "Quá hạn" (BR-BIL-08: tính từ hạn, backend không lưu); các trạng thái khác theo `labels.ts`. */
export function chargeLabel(c: Status): string {
  return c.status === 'UNPAID' && c.overdue ? 'Quá hạn' : CHARGE_STATUS_LABELS[c.status];
}

export function chargeTone(c: Status): Tone {
  switch (c.status) {
    case 'PAID':
      return 'success';
    case 'EXEMPT':
      return 'info';
    case 'WRITTEN_OFF':
      return 'neutral';
    default:
      return c.overdue ? 'danger' : 'warning';
  }
}
