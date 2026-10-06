import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import { vi } from 'vitest';

import { IssuePayoutForm } from './IssuePayoutForm';

const row = {
  companyId: 2, companyCode: 'DV02', companyName: 'Công ty Hai', periodId: 10, due: 1_000_000, chargeCount: 10, adjustment: 0, refunded: 0,
  collected: 1_000_000, cashCollected: 0, received: 0, receiptCount: 0, remaining: -228_000, gap: 228_000, previousDebt: 0,
  overdue: false, collectionRate: 100, lowCollectionRate: false, remittedRate: 0, lowRemittedRate: false,
  progress: 'PAID_IN_FULL' as const, reconciliation: 'PENDING' as const, retained: 228_000, payable: -228_000, debtCollected: 0,
  communePaid: 100_000, communeOwed: 128_000, qrTotal: 0, qrTransport: 0, qrCollection: 0, cashTransport: 0, cashCollection: 0, holding: 0, entitled: 0, settled: false, lastPeriodDebt: 0,
};
const norm = { normalizer: (s: string) => s.replace(/\s+/g, ' ').trim() };

function setup() {
  const onSubmit = vi.fn();
  render(
    <AntApp>
      <IssuePayoutForm row={row} periodLabel="Tháng 10/2026" onSubmit={onSubmit} onCancel={() => {}} />
    </AntApp>,
  );
  return onSubmit;
}

describe('IssuePayoutForm', () => {
  it('số tiền bắt buộc, lớn hơn 0 và không vượt số xã còn phải trả', async () => {
    const onSubmit = setup();
    const ok = screen.getByRole('button', { name: 'Lập phiếu' });
    await userEvent.click(ok);
    expect(await screen.findByText('Vui lòng nhập số tiền')).toBeInTheDocument();

    const amount = screen.getByLabelText('Số tiền');
    await userEvent.type(amount, '128001');
    await userEvent.click(ok);
    expect(await screen.findByText('Không vượt số xã còn phải trả (128.000 đ)', norm)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('gửi phiếu trả một phần, ngày mặc định hôm nay', async () => {
    const onSubmit = setup();
    await userEvent.type(screen.getByLabelText('Số tiền'), '28000');
    await userEvent.type(screen.getByLabelText('Số ủy nhiệm chi / mã giao dịch'), 'UNC-77');
    await userEvent.click(screen.getByRole('button', { name: 'Lập phiếu' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        companyId: 2, periodId: 10, amount: 28_000, method: 'TRANSFER', payoutDate: dayjs().format('YYYY-MM-DD'), documentRef: 'UNC-77',
        note: undefined,
      }),
    );
  });
});
