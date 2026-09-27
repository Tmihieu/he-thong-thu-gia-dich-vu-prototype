import { summarizeCharges, type CitizenCharge } from './api';

function charge(partial: Partial<CitizenCharge> & Pick<CitizenCharge, 'id' | 'status' | 'dueDate'>): CitizenCharge {
  return {
    code: `KT-${partial.id}`,
    periodId: 1,
    periodCode: '2026-10',
    periodLabel: 'Tháng 10/2026',
    feeTypeCode: 'ENV',
    feeTypeName: 'Phí VSMT',
    amount: 80_000,
    paidAmount: 0,
    remainingAmount: 80_000,
    coverageFrom: '2026-10-01',
    coverageTo: '2026-10-31',
    overdue: false,
    paidAt: null,
    ...partial,
  };
}

describe('summarizeCharges', () => {
  it('tách chưa đóng (hạn gần trước) và lịch sử, cộng tổng còn phải đóng và đếm quá hạn', () => {
    const list = [
      charge({ id: 1, status: 'PAID', dueDate: '2026-09-25', paidAmount: 80_000, remainingAmount: 0 }),
      charge({ id: 2, status: 'UNPAID', dueDate: '2026-11-25' }),
      charge({ id: 3, status: 'UNPAID', dueDate: '2026-10-25', overdue: true, paidAmount: 30_000, remainingAmount: 50_000 }),
      charge({ id: 4, status: 'EXEMPT', dueDate: '2026-10-25', amount: 0, remainingAmount: 0 }),
    ];

    const s = summarizeCharges(list);

    expect(s.unpaid.map((c) => c.id)).toEqual([3, 2]);
    expect(s.history.map((c) => c.id)).toEqual([1, 4]);
    expect(s.totalRemaining).toBe(130_000);
    expect(s.overdueCount).toBe(1);
    expect(s.next?.id).toBe(3);
  });

  it('danh sách rỗng hoặc chưa tải', () => {
    expect(summarizeCharges(undefined)).toEqual({ unpaid: [], history: [], totalRemaining: 0, overdueCount: 0, next: null });
  });
});
