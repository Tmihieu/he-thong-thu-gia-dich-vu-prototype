import dayjs from 'dayjs';

const EMPTY = '—';
const NBSP = String.fromCharCode(0xa0);
const moneyFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** Tiền VND nguyên: 1234567 → "1.234.567 đ" (khoảng trắng không ngắt dòng trước "đ"). */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return `${moneyFormatter.format(value)}${NBSP}đ`;
}

/** Ngày ISO (`yyyy-MM-dd` hoặc có giờ) → `dd/MM/yyyy`, thêm ` HH:mm` khi `withTime`. */
export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return EMPTY;
  const d = dayjs(value);
  if (!d.isValid()) return EMPTY;
  return d.format(withTime ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY');
}
