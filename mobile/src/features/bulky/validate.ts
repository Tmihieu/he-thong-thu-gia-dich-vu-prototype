import type { BulkyItemType } from '../../shared/labels';

export interface BulkyDraft {
  itemType: BulkyItemType | null;
  quantity: string;
  address: string;
  /** `YYYY-MM-DD` */
  preferredDate: string | null;
}

export type BulkyErrors = Partial<Record<keyof BulkyDraft, string>>;

export const QUANTITY_MAX = 99;
export const ADDRESS_MAX = 255;

/** Ngày theo giờ máy, dạng `YYYY-MM-DD` (không dùng `toISOString` vì lệch múi giờ). */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `n` ngày liên tiếp từ hôm nay, để chọn ngày mong muốn không cần thư viện lịch. */
export function nextDays(today: Date, n: number): string[] {
  return Array.from({ length: n }, (_, i) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)));
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** `2026-10-04` → `T7 04/10`. */
export function shortDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[new Date(y!, m! - 1, d!).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

/** Kiểm tra form đăng ký trước khi gọi API (backend kiểm lại: `CreateBulkyRequest`, `BULKY_DATE_PAST`). */
export function validateBulky(draft: BulkyDraft, today: string): BulkyErrors {
  const errors: BulkyErrors = {};
  if (!draft.itemType) errors.itemType = 'Chọn loại vật dụng.';
  const q = draft.quantity.trim();
  if (!/^\d+$/.test(q) || Number(q) < 1) errors.quantity = 'Số lượng phải từ 1 trở lên.';
  else if (Number(q) > QUANTITY_MAX) errors.quantity = `Số lượng tối đa ${QUANTITY_MAX}.`;
  const address = draft.address.trim();
  if (!address) errors.address = 'Nhập địa chỉ thu gom.';
  else if (address.length > ADDRESS_MAX) errors.address = `Địa chỉ tối đa ${ADDRESS_MAX} ký tự.`;
  if (!draft.preferredDate) errors.preferredDate = 'Chọn ngày mong muốn.';
  else if (draft.preferredDate < today) errors.preferredDate = 'Ngày mong muốn không được trước hôm nay.';
  return errors;
}
