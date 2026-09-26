import { render, screen } from '@testing-library/react';

import { DateText } from './DateText';
import { formatDate, formatMoney } from './format';
import { MoneyText } from './MoneyText';

describe('formatMoney / MoneyText', () => {
  it.each([
    [0, '0 đ'],
    [80000, '80.000 đ'],
    [1234567, '1.234.567 đ'],
    [9_876_543_210, '9.876.543.210 đ'],
    [-50000, '-50.000 đ'],
  ])('%d → %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });

  it('hiển thị gạch ngang khi không có giá trị', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(Number.NaN)).toBe('—');
  });

  it('render số lớn trong component', () => {
    render(<MoneyText value={1234567} />);
    expect(screen.getByText('1.234.567 đ', { normalizer: (s) => s.replace(/\s+/g, ' ') })).toBeInTheDocument();
  });
});

describe('formatDate / DateText', () => {
  it('ngày ISO yyyy-MM-dd → dd/MM/yyyy', () => {
    expect(formatDate('2026-10-01')).toBe('01/10/2026');
    expect(formatDate('2026-12-31')).toBe('31/12/2026');
  });

  it('thời điểm ISO UTC đổi sang giờ Việt Nam', () => {
    expect(formatDate('2026-09-30T17:30:00Z')).toBe('01/10/2026');
    expect(formatDate('2026-09-30T17:30:00Z', true)).toBe('01/10/2026 00:30');
  });

  it('giá trị rỗng hoặc sai định dạng → gạch ngang', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('không-phải-ngày')).toBe('—');
  });

  it('render trong component', () => {
    render(<DateText value="2026-10-01" />);
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
  });
});
