import { chargeLabel, chargeTone } from './chargeStatus';

describe('chargeStatus', () => {
  it('gọi đúng bốn trạng thái khoản thu', () => {
    expect(chargeLabel({ status: 'UNPAID', overdue: false })).toBe('Chưa đóng');
    expect(chargeLabel({ status: 'PAID', overdue: false })).toBe('Đã đóng');
    expect(chargeLabel({ status: 'EXEMPT', overdue: false })).toBe('Miễn giảm');
    expect(chargeLabel({ status: 'WRITTEN_OFF', overdue: false })).toBe('Đã xóa nợ');
  });

  it('chỉ khoản chưa thu mới có thể quá hạn', () => {
    expect(chargeLabel({ status: 'UNPAID', overdue: true })).toBe('Quá hạn');
    expect(chargeTone({ status: 'UNPAID', overdue: true })).toBe('danger');
    expect(chargeLabel({ status: 'PAID', overdue: true })).toBe('Đã đóng');
    expect(chargeTone({ status: 'WRITTEN_OFF', overdue: true })).toBe('neutral');
  });
});
