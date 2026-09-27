import { validateOtp, validatePhone } from './validate';

describe('validatePhone', () => {
  it.each(['0902000128', '0902 000 128', '+84 902 000 128', '02838123456'])('chấp nhận %s', (phone) => {
    expect(validatePhone(phone)).toBeNull();
  });

  it('báo lỗi khi trống hoặc sai định dạng', () => {
    expect(validatePhone('')).toMatch(/Nhập số điện thoại/);
    expect(validatePhone('abc')).toMatch(/10 hoặc 11 chữ số/);
    expect(validatePhone('902000128')).toMatch(/bắt đầu bằng 0/);
    expect(validatePhone('090200012345')).toMatch(/10 hoặc 11/);
  });
});

describe('validateOtp', () => {
  it('chấp nhận 4–8 chữ số, kể cả có khoảng trắng hai đầu', () => {
    expect(validateOtp('123456')).toBeNull();
    expect(validateOtp(' 1234 ')).toBeNull();
  });

  it('báo lỗi khi trống hoặc không phải chữ số', () => {
    expect(validateOtp('')).toMatch(/Nhập mã OTP/);
    expect(validateOtp('12a4')).toMatch(/4–8 chữ số/);
    expect(validateOtp('123')).toMatch(/4–8 chữ số/);
  });
});
