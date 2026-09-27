import { formatTime, formatTimeRange, scheduleDayLabel } from './format';

describe('lịch thu gom', () => {
  it('rút gọn giờ và ghép khung giờ như prototype', () => {
    expect(formatTime('17:00:00')).toBe('17:00');
    expect(formatTime('08:30')).toBe('08:30');
    expect(formatTimeRange('17:00:00', '19:00:00')).toBe('17:00 – 19:00');
  });

  it.each([
    [2, null, 'Thứ 3'],
    [6, undefined, 'Thứ 7'],
    [7, null, 'Chủ nhật'],
    [7, 1, 'Chủ nhật đầu tháng'],
    [6, 5, 'Thứ 7 cuối tháng'],
    [1, 2, 'Thứ 2 thứ hai của tháng'],
  ])('thứ %d tuần %s → %s', (weekday, week, expected) => {
    expect(scheduleDayLabel(weekday, week)).toBe(expected);
  });
});
