/** Kiểm tra phía app trước khi gọi API; backend chuẩn hóa lại lần nữa (`PhoneNumbers`). */

export function validatePhone(raw: string): string | null {
  const digits = raw.replace(/[\s.()-]/g, '');
  if (!digits) return 'Nhập số điện thoại.';
  const normalized = digits.startsWith('+84') ? `0${digits.slice(3)}` : digits;
  if (!/^0\d{9,10}$/.test(normalized)) return 'Số điện thoại phải có 10 hoặc 11 chữ số, bắt đầu bằng 0 hoặc +84.';
  return null;
}

export function validateOtp(raw: string): string | null {
  const otp = raw.trim();
  if (!otp) return 'Nhập mã OTP.';
  if (!/^\d{4,8}$/.test(otp)) return 'Mã OTP gồm 4–8 chữ số.';
  return null;
}
