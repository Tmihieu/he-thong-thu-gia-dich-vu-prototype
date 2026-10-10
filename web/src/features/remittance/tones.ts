import type { semantic } from '../../app/theme';
import type { LedgerRow } from './api';

type Tone = keyof typeof semantic;

/** Màu ngữ nghĩa: đã quyết toán = success, lệch / quá hạn = danger, chưa có gì = neutral. */
export const PROGRESS_TONES: Record<LedgerRow['progress'], Tone> = {
  NO_COMPANY: 'danger',
  PAID_IN_FULL: 'success',
  OVERDUE: 'danger',
  NOT_PAID: 'neutral',
};
