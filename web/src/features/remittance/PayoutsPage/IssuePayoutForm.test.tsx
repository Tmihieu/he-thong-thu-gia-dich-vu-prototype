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
  it('điền sẵn số xã còn phải trả; số tiền lớn hơn 0 và không vượt số đó', async () => {
    const onSubmit = setup();
    const ok = screen.getByRole('button', { name: 'Lập phiếu' });
    const amount = screen.getByLabelText('Số tiền');
    expect(amount).toHaveValue('128.000');
    // Xóa trắng thì ô về 0.
    await userEvent.clear(amount);
    await userEvent.click(ok);
    expect(await screen.findByText('Số tiền phải lớn hơn 0')).toBeInTheDocument();

    await userEvent.type(amount, '128001');
    await userEvent.click(ok);
    expect(await screen.findByText('Không vượt số xã còn phải trả (128.000 đ)', norm)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('đóng rồi mở phiếu công ty khác thì số tiền đúng số xã còn phải trả công ty đó, không giữ số cũ', async () => {
    const other = { ...row, companyId: 3, companyCode: 'DV03', companyName: 'Công ty Ba', communeOwed: 165_000 };
    const view = (r: typeof row | null) => (
      <AntApp>
        <IssuePayoutForm row={r} periodLabel="Tháng 10/2026" onSubmit={() => {}} onCancel={() => {}} />
      </AntApp>
    );
    const { rerender } = render(view(row));
    const amount = screen.getByLabelText('Số tiền');
    await userEvent.clear(amount);
    await userEvent.type(amount, '5000');

    rerender(view(null));
    rerender(view(other));
    await waitFor(() => expect(screen.getByLabelText('Số tiền')).toHaveValue('165.000'));

    rerender(view(null));
    rerender(view(row));
    await waitFor(() => expect(screen.getByLabelText('Số tiền')).toHaveValue('128.000'));
  });

  it('gửi phiếu trả một phần, ngày mặc định hôm nay', async () => {
    const onSubmit = setup();
    await userEvent.clear(screen.getByLabelText('Số tiền'));
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
