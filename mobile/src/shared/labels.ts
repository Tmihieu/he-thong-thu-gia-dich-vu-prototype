import type { components } from '../api/schema';

type Schemas = components['schemas'];

export type SubjectType = Schemas['HouseholdDto']['subjectType'];
export type SubjectStatus = Schemas['HouseholdDto']['status'];
export type TariffGroup = Schemas['HouseholdContractDto']['tariffGroup'];
export type ChargeStatus = Schemas['CitizenChargeDto']['status'];
export type PaymentMethod = Schemas['PaymentConfirmationDto']['method'];
export type WasteType = Schemas['CollectionScheduleDto']['wasteType'];

/** Nhãn tiếng Việt cho enum của backend (SPEC §6: enum lưu chuỗi, nhãn ở frontend). */
export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  HOUSEHOLD: 'Hộ gia đình',
  BUSINESS_HOUSEHOLD: 'Hộ kinh doanh',
  ENTERPRISE: 'Doanh nghiệp',
};

export const SUBJECT_STATUS_LABELS: Record<SubjectStatus, string> = {
  ACTIVE: 'Đang cung cấp dịch vụ',
  PENDING: 'Chờ xử lý',
  ENDED: 'Đã chấm dứt',
};

export const TARIFF_GROUP_LABELS: Record<TariffGroup, string> = {
  HH_UP_TO_2: 'Hộ gia đình ≤ 2 người',
  HH_3_PLUS: 'Hộ gia đình ≥ 3 người',
  SMALL_GENERATOR: 'Chủ nguồn thải nhỏ',
  BY_VOLUME: 'Theo khối lượng',
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  UNPAID: 'Chưa đóng',
  PAID: 'Đã đóng',
  EXEMPT: 'Miễn',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  APP_SIMULATED: 'Ứng dụng (mô phỏng)',
};

export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  HOUSEHOLD: 'Rác sinh hoạt',
  HOUSEHOLD_RECYCLABLE: 'Rác sinh hoạt + tái chế',
  BULKY: 'Rác cồng kềnh (đã đăng ký)',
};

/** Thứ ISO (1 = Thứ 2 … 7 = Chủ nhật). */
export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
};
