/**
 * Định dạng tiền và ngày như web (`web/src/shared/format.ts`) nhưng không dùng thư viện: Hermes trên
 * điện thoại không đảm bảo đủ dữ liệu Intl cho vi-VN. Giờ hiển thị luôn theo Việt Nam (UTC+7, không đổi mùa).
 */

const EMPTY = '—';
const NBSP = String.fromCharCode(0xa0);
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Tiền VND nguyên: 1234567 → "1.234.567 đ" (khoảng trắng không ngắt dòng trước "đ"). */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  const digits = Math.trunc(Math.abs(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${digits}${NBSP}đ`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Ngày ISO (`yyyy-MM-dd` hoặc có giờ) → `dd/MM/yyyy`, thêm ` HH:mm` khi `withTime`. */
export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return EMPTY;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return withTime ? `${d}/${m}/${y} 00:00` : `${d}/${m}/${y}`;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return EMPTY;
  const vn = new Date(ms + VN_OFFSET_MS);
  const date = `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
  return withTime ? `${date} ${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}` : date;
}

/** Chữ cái đầu của họ và tên cuối để làm avatar: "Nguyễn Văn Mẫu" → "NM". */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
