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
  SMALL_UP_TO_126: 'Chủ nguồn thải nhỏ ≤ 126 kg/tháng',
  SMALL_126_TO_250: 'Chủ nguồn thải nhỏ 126–250 kg/tháng',
  SMALL_250_TO_500: 'Chủ nguồn thải nhỏ 250–500 kg/tháng',
  BY_VOLUME: 'Chủ nguồn thải lớn 500–9.000 kg/tháng',
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  UNPAID: 'Chưa đóng',
  PAID: 'Đã đóng',
  EXEMPT: 'Miễn giảm',
  WRITTEN_OFF: 'Đã xóa nợ',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  APP_SIMULATED: 'Ứng dụng (mô phỏng)',
  REFUND: 'Hoàn tiền',
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

export type ComplaintCategory = Schemas['CitizenComplaintDto']['category'];
export type ComplaintStatus = Schemas['CitizenComplaintDto']['status'];
export type ComplaintEventType = Schemas['CitizenComplaintEventDto']['eventType'];

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  LATE_COLLECTION: 'Thu gom chậm hoặc không đúng lịch',
  OVERCHARGE: 'Thu phí cao hơn định mức',
  POLLUTION_POINT: 'Điểm tập kết gây ô nhiễm',
  STAFF_ATTITUDE: 'Thái độ nhân viên thu gom',
  FACILITY: 'Cơ sở vật chất',
  COLLECTION_REQUEST: 'Đề nghị thu gom',
  PAID_NOT_RECORDED: 'Đã đóng nhưng chưa được ghi nhận',
  OTHER: 'Vấn đề khác',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: 'Đã gửi',
  PROCESSING: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
};

export const COMPLAINT_EVENT_LABELS: Record<ComplaintEventType, string> = {
  SUBMITTED: 'Bạn gửi phản ánh',
  RECEIVED: 'Xã tiếp nhận',
  FORWARDED: 'Xã chuyển công ty xử lý',
  COMPANY_REPLIED: 'Công ty phản hồi',
  CLOSED: 'Xã đóng phản ánh',
};

export type BulkyItemType = Schemas['BulkyRequestDto']['itemType'];
export type BulkyStatus = Schemas['BulkyRequestDto']['status'];
export type DaySlot = NonNullable<Schemas['BulkyRequestDto']['preferredSlot']>;

export const BULKY_ITEM_LABELS: Record<BulkyItemType, string> = {
  MATTRESS: 'Nệm, chăn ga khối lớn',
  FURNITURE: 'Tủ, bàn, ghế, sofa',
  LARGE_APPLIANCE: 'Thiết bị điện lớn (tủ lạnh, máy giặt)',
  DEBRIS: 'Xà bần, cành cây lớn',
};

export const BULKY_STATUS_LABELS: Record<BulkyStatus, string> = {
  PENDING: 'Chờ công ty báo phí',
  QUOTED: 'Đã báo phí',
  COLLECTED: 'Đã thu gom',
  CANCELLED: 'Đã hủy',
};

export const DAY_SLOT_LABELS: Record<DaySlot, string> = {
  MORNING: 'Buổi sáng',
  AFTERNOON: 'Buổi chiều',
};

export type MarketTag = Schemas['MarketPostDto']['tags'][number];
export type MarketCategory = Schemas['MarketPostDto']['category'];

export const MARKET_TAG_LABELS: Record<MarketTag, string> = {
  FIND: 'Tìm đồ',
  SELL: 'Bán đồ',
  GIVE: 'Cho tặng',
  EXCHANGE: 'Đổi đồ',
};

export const MARKET_CATEGORY_LABELS: Record<MarketCategory, string> = {
  HOUSEHOLD: 'Đồ gia dụng',
  ELECTRONICS: 'Điện tử',
  FURNITURE: 'Nội thất',
  CHILDREN: 'Đồ trẻ em',
  TOOLS_VEHICLES: 'Xe đạp và dụng cụ',
  OTHER: 'Khác',
};
