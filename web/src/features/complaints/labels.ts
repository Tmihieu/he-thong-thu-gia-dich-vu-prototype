import type { Complaint, ComplaintEvent } from './api';

export const COMPLAINT_STATUS_LABELS: Record<Complaint['status'], string> = {
  NEW: 'Mới tiếp nhận',
  PROCESSING: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
};

export const COMPLAINT_STATUS_COLORS: Record<Complaint['status'], string> = {
  NEW: 'orange',
  PROCESSING: 'blue',
  RESOLVED: 'green',
};

export const COMPLAINT_CHANNEL_LABELS: Record<Complaint['channel'], string> = {
  APP: 'Ứng dụng người dân',
  PHONE: 'Điện thoại',
  IN_PERSON: 'Trực tiếp tại xã',
};

export const COMPLAINT_CATEGORY_LABELS: Record<Complaint['category'], string> = {
  LATE_COLLECTION: 'Thu gom chậm hoặc không đúng lịch',
  OVERCHARGE: 'Thu phí cao hơn định mức',
  POLLUTION_POINT: 'Điểm tập kết gây ô nhiễm',
  STAFF_ATTITUDE: 'Thái độ nhân viên thu gom',
  OTHER: 'Vấn đề khác',
};

export const COMPLAINT_EVENT_LABELS: Record<ComplaintEvent['eventType'], string> = {
  SUBMITTED: 'Người dân gửi',
  RECEIVED: 'Xã tiếp nhận',
  FORWARDED: 'Chuyển công ty',
  COMPANY_REPLIED: 'Công ty phản hồi',
  CLOSED: 'Đã giải quyết',
};
