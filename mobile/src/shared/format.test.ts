import { formatDate, formatMoney, initials } from './format';

const NBSP = String.fromCharCode(0xa0);

describe('formatMoney', () => {
  it.each([
    [0, `0${NBSP}đ`],
    [80000, `80.000${NBSP}đ`],
    [1234567, `1.234.567${NBSP}đ`],
    [9_876_543_210, `9.876.543.210${NBSP}đ`],
    [-50000, `-50.000${NBSP}đ`],
    [1266000, `1.266.000${NBSP}đ`],
  ])('%d → %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });

  it('hiển thị gạch ngang khi không có giá trị', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(Number.NaN)).toBe('—');
  });
});

describe('formatDate', () => {
  it('ngày ISO yyyy-MM-dd → dd/MM/yyyy', () => {
    expect(formatDate('2026-10-01')).toBe('01/10/2026');
    expect(formatDate('2026-12-31')).toBe('31/12/2026');
  });

  it('thời điểm ISO UTC đổi sang giờ Việt Nam', () => {
    expect(formatDate('2026-09-30T17:30:00Z')).toBe('01/10/2026');
    expect(formatDate('2026-09-30T17:30:00Z', true)).toBe('01/10/2026 00:30');
  });

  it('thời điểm có múi giờ +07:00 giữ nguyên giờ', () => {
    expect(formatDate('2026-10-12T17:40:00+07:00', true)).toBe('12/10/2026 17:40');
  });

  it('giá trị rỗng hoặc sai định dạng → gạch ngang', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('không phải ngày')).toBe('—');
  });
});

describe('initials', () => {
  it.each([
    ['Nguyễn Văn Mẫu', 'NM'],
    ['Hộ mẫu 128', 'H1'],
    ['Mai', 'M'],
    ['', '?'],
    [null, '?'],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
