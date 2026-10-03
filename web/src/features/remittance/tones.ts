import type { semantic } from '../../app/theme';
import type { LedgerRow } from './api';

type Tone = keyof typeof semantic;

/** Màu ngữ nghĩa: đã nộp / khớp = success, đang nộp / chờ = warning, lệch / quá hạn = danger, chưa có gì = neutral. */
export const PROGRESS_TONES: Record<LedgerRow['progress'], Tone> = {
  NO_COMPANY: 'danger',
  PAID_IN_FULL: 'success',
  OVERDUE: 'danger',
  PARTIAL: 'warning',
  NOT_PAID: 'neutral',
};

export const RECONCILIATION_TONES: Record<LedgerRow['reconciliation'], Tone> = {
  MATCHED: 'success',
  PENDING: 'warning',
  MISMATCH: 'danger',
};

export const ISSUE_TONES: Record<'PENDING' | 'RESOLVED', Tone> = { PENDING: 'warning', RESOLVED: 'success' };
