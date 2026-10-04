import { ROLE_LABELS } from '../../../app/layout/menuConfig';
import { formatDate, formatMoney } from '../../../shared/format';
import {
  CHARGE_STATUS_LABELS,
  COMPANY_TYPE_LABELS,
  PERIOD_STATUS_LABELS,
  PERIOD_TYPE_LABELS,
  SUBJECT_STATUS_LABELS,
  SUBJECT_TYPE_LABELS,
  TARIFF_GROUP_LABELS,
  TARIFF_STATUS_LABELS,
} from '../../../shared/labels';

/** Tên trường backend ghi trong dữ liệu trước/sau → nhãn tiếng Việt (BR-GEN-07). Trường lạ hiện "Thông tin khác". */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  id: 'Mã nội bộ', code: 'Mã', name: 'Tên', note: 'Ghi chú', status: 'Trạng thái', sortOrder: 'Thứ tự',
  username: 'Tên đăng nhập', fullName: 'Họ và tên', role: 'Vai trò', companyId: 'Công ty', phone: 'Số điện thoại',
  email: 'Email', organization: 'Đơn vị', locked: 'Đã khóa', lastLoginAt: 'Đăng nhập gần nhất',
  contactName: 'Người đầu mối', contactPhone: 'SĐT đầu mối', orgType: 'Loại hình', taxCode: 'Mã số thuế',
  address: 'Địa chỉ', bankAccount: 'Số tài khoản', bankName: 'Ngân hàng', communeContractNo: 'Số hợp đồng với xã',
  validFrom: 'Hiệu lực từ', validTo: 'Hiệu lực đến', fromDate: 'Từ ngày', toDate: 'Đến ngày', decisionNo: 'Số văn bản',
  areaId: 'Khu vực', areaCode: 'Mã khu vực', districtId: 'Địa bàn', districtCode: 'Mã địa bàn', companyCode: 'Mã công ty',
  subjectId: 'Đối tượng', subjectType: 'Loại đối tượng', subjectCode: 'Mã đối tượng', tariffGroup: 'Nhóm giá',
  memberCount: 'Số thành viên', exempt: 'Miễn 100%', exemptReason: 'Lý do miễn', monthlyQuotaKg: 'Định mức kg/tháng',
  periodId: 'Kỳ thu', periodType: 'Loại kỳ', year: 'Năm', month: 'Tháng', quarter: 'Quý', dueDate: 'Hạn nộp',
  openDate: 'Ngày mở kỳ', lockedAt: 'Khóa lúc', startDate: 'Ngày bắt đầu', endDate: 'Ngày kết thúc',
  amount: 'Số tiền', unitPrice: 'Đơn giá', totalAmount: 'Tổng tiền', months: 'Số tháng', chargeCount: 'Số khoản',
  requestCode: 'Mã phiếu', feeTypeCode: 'Loại phí', scopeType: 'Phạm vi', method: 'Hình thức', reason: 'Lý do',
  type: 'Loại', decisionNote: 'Ý kiến', collectorId: 'Người đi thu', price: 'Đơn giá', version: 'Phiên bản',
};

const ENUM_LABELS: Record<string, string> = {
  ...ROLE_LABELS, ...COMPANY_TYPE_LABELS, ...TARIFF_GROUP_LABELS, ...TARIFF_STATUS_LABELS, ...PERIOD_TYPE_LABELS,
  ...PERIOD_STATUS_LABELS, ...SUBJECT_TYPE_LABELS, ...SUBJECT_STATUS_LABELS, ...CHARGE_STATUS_LABELS,
  ACTIVE: 'Hoạt động', INACTIVE: 'Tạm ngưng', LOCKED: 'Đã khóa', SYSTEM: 'Hệ thống', CITIZEN: 'Người dân',
  REFUND: 'Hoàn tiền', WRITE_OFF: 'Xóa nợ', EXEMPTION: 'Miễn giảm', PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối', CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', ALL: 'Toàn xã', AREAS: 'Chọn tổ', COMPANY: 'Theo công ty',
};

const MONEY_KEY = /amount|price|total/i;
const DATE_VALUE = /^\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?$/;

/** Giá trị trước/sau → chữ dễ đọc: nhãn enum, Có/Không, ngày dd/MM/yyyy, tiền có "đ"; null → "—". */
export function auditValue(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Có' : 'Không';
  if (typeof v === 'number') return MONEY_KEY.test(key) ? formatMoney(v) : String(v);
  if (typeof v === 'string') {
    if (ENUM_LABELS[v]) return ENUM_LABELS[v];
    if (DATE_VALUE.test(v)) return formatDate(v, v.length > 10);
    return v;
  }
  return JSON.stringify(v);
}

export interface AuditDiffRow {
  key: string;
  label: string;
  before: string;
  after: string;
}

function parse(data: string | null): Record<string, unknown> | null {
  if (data === null) return null;
  try {
    const o: unknown = JSON.parse(data);
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Các trường đổi giữa trước và sau (tạo mới / xóa thì hiện mọi trường). Dữ liệu không phải đối tượng JSON → null. */
export function auditDiff(before: string | null, after: string | null): AuditDiffRow[] | null {
  const b = parse(before);
  const a = parse(after);
  if (before !== null && !b) return null;
  if (after !== null && !a) return null;
  const keys = [...new Set([...Object.keys(b ?? {}), ...Object.keys(a ?? {})])];
  return keys
    .filter((k) => !b || !a || JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map((k) => ({
      key: k,
      label: AUDIT_FIELD_LABELS[k] ?? 'Thông tin khác',
      before: auditValue(k, b?.[k]),
      after: auditValue(k, a?.[k]),
    }));
}
