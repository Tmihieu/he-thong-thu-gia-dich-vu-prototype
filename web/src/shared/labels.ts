import type { components } from '../api/schema';

type Schemas = components['schemas'];

export type TariffGroup = Schemas['TariffRateDto']['tariffGroup'];
export type TariffStatus = Schemas['TariffVersionDto']['status'];
export type PeriodType = Schemas['PeriodDto']['periodType'];
export type PeriodStatus = Schemas['PeriodDto']['status'];
export type SubjectType = Schemas['SubjectDto']['subjectType'];
export type SubjectStatus = Schemas['SubjectDto']['status'];
export type ChargeStatus = Schemas['ChargeDto']['status'];
export type ChargeScope = Schemas['IssueRequest']['scopeType'];
export type LedgerProgress = Schemas['LedgerRowDto']['progress'];
export type LedgerReconciliation = Schemas['LedgerRowDto']['reconciliation'];

/** Nhãn tiếng Việt cho enum của backend (SPEC §6: enum lưu chuỗi, nhãn ở frontend). */
export const TARIFF_GROUP_LABELS: Record<TariffGroup, string> = {
  HH_UP_TO_2: 'HGĐ ≤ 2 người',
  HH_3_PLUS: 'HGĐ ≥ 3 người',
  SMALL_GENERATOR: 'Chủ nguồn thải nhỏ',
  BY_VOLUME: 'Theo khối lượng',
};

export const TARIFF_STATUS_LABELS: Record<TariffStatus, string> = {
  DRAFT: 'Dự thảo',
  ACTIVE: 'Đang áp dụng',
  EXPIRED: 'Hết hiệu lực',
};

export const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  MONTH: 'Tháng',
  QUARTER: 'Quý',
};

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  OPEN: 'Đã mở',
  COLLECTING: 'Đang thu',
  LOCKED: 'Đã khóa',
};

export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  HOUSEHOLD: 'Hộ gia đình',
  BUSINESS_HOUSEHOLD: 'Hộ kinh doanh',
  ENTERPRISE: 'Doanh nghiệp',
};

export const SUBJECT_STATUS_LABELS: Record<SubjectStatus, string> = {
  ACTIVE: 'Đang cung cấp',
  PENDING: 'Chờ xử lý',
  ENDED: 'Đã chấm dứt',
};

export const SUBJECT_STATUS_COLORS: Record<SubjectStatus, string> = {
  ACTIVE: 'green',
  PENDING: 'orange',
  ENDED: 'default',
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  UNPAID: 'Chưa thu',
  PAID: 'Đã thu',
  EXEMPT: 'Miễn giảm',
};

export const CHARGE_STATUS_COLORS: Record<ChargeStatus, string> = {
  UNPAID: 'orange',
  PAID: 'green',
  EXEMPT: 'purple',
};

export const CHARGE_SCOPE_LABELS: Record<ChargeScope, string> = {
  ALL: 'Toàn xã',
  AREAS: 'Chọn tổ',
  COMPANY: 'Theo công ty',
};

/** Tiến độ nộp tiền (R13). */
export const PROGRESS_LABELS: Record<LedgerProgress, string> = {
  NO_COMPANY: 'Chưa có công ty',
  PAID_IN_FULL: 'Đã nộp đủ',
  OVERDUE: 'Quá hạn nộp',
  PARTIAL: 'Nộp một phần',
  NOT_PAID: 'Chưa nộp',
};

export const PROGRESS_COLORS: Record<LedgerProgress, string> = {
  NO_COMPANY: 'red',
  PAID_IN_FULL: 'green',
  OVERDUE: 'red',
  PARTIAL: 'orange',
  NOT_PAID: 'default',
};

/** Đối soát (R14). */
export const RECONCILIATION_LABELS: Record<LedgerReconciliation, string> = {
  MATCHED: 'Khớp',
  PENDING: 'Đang nộp',
  MISMATCH: 'Lệch',
};

export const RECONCILIATION_COLORS: Record<LedgerReconciliation, string> = {
  MATCHED: 'green',
  PENDING: 'orange',
  MISMATCH: 'red',
};

/** Màu Tag của AntD theo trạng thái. */
export const STATUS_COLORS: Record<TariffStatus | PeriodStatus, string> = {
  DRAFT: 'default',
  ACTIVE: 'green',
  EXPIRED: 'default',
  OPEN: 'blue',
  COLLECTING: 'green',
  LOCKED: 'default',
};
