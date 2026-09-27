import { isoDate, nextDays, shortDayLabel, validateBulky } from './validate';

const ok = { itemType: 'FURNITURE' as const, quantity: '2', address: '12/5 đường Số 1', preferredDate: '2026-10-18' };

describe('validateBulky', () => {
  it('hợp lệ khi đủ loại, số lượng, địa chỉ, ngày từ hôm nay', () => {
    expect(validateBulky(ok, '2026-10-01')).toEqual({});
    expect(validateBulky({ ...ok, preferredDate: '2026-10-01' }, '2026-10-01')).toEqual({});
  });

  it('ngày mong muốn trước hôm nay hoặc chưa chọn thì báo lỗi', () => {
    expect(validateBulky({ ...ok, preferredDate: '2026-09-30' }, '2026-10-01').preferredDate).toMatch(/trước hôm nay/);
    expect(validateBulky({ ...ok, preferredDate: null }, '2026-10-01').preferredDate).toMatch(/Chọn ngày/);
  });

  it('số lượng phải là số nguyên 1..99', () => {
    for (const quantity of ['0', '', '1.5', '-1', 'abc']) {
      expect(validateBulky({ ...ok, quantity }, '2026-10-01').quantity).toMatch(/từ 1 trở lên/);
    }
    expect(validateBulky({ ...ok, quantity: '100' }, '2026-10-01').quantity).toMatch(/99/);
  });

  it('bắt buộc loại vật dụng và địa chỉ (khoảng trắng không tính)', () => {
    const errors = validateBulky({ ...ok, itemType: null, address: '  ' }, '2026-10-01');
    expect(errors.itemType).toMatch(/Chọn loại/);
    expect(errors.address).toMatch(/Nhập địa chỉ/);
  });
});

describe('ngày', () => {
  it('nextDays bắt đầu từ hôm nay, qua tháng đúng', () => {
    expect(nextDays(new Date(2026, 8, 29), 4)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('shortDayLabel có thứ và ngày/tháng', () => {
    expect(shortDayLabel('2026-10-04')).toBe('CN 04/10');
    expect(shortDayLabel('2026-10-03')).toBe('T7 03/10');
  });
});
