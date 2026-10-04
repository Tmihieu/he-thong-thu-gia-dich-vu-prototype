import { describe, expect, it } from 'vitest';

import type { CollectorCharge } from './api';
import { countChips } from './workState';

const work = (status: string, extra: Record<string, unknown> = {}, overdue = true) =>
  ({ charge: { status, overdue }, paidAmount: 0, remainingAmount: 0, ...extra }) as unknown as CollectorCharge;

describe('countChips', () => {
  it('Chưa thu gồm cả quá hạn; Quá hạn là tập con; miễn giảm không vào nhóm nào', () => {
    const items = [
      work('PAID'),
      work('UNPAID'),
      work('UNPAID'),
      work('UNPAID', {}, false),
      work('EXEMPT'),
    ];
    expect(countChips(items)).toMatchObject({ ALL: 5, PAID: 1, UNPAID: 3, OVERDUE: 2 });
  });
});
