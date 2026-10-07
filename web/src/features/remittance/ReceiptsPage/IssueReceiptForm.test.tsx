import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import { vi } from 'vitest';

import { IssueReceiptForm } from './IssueReceiptForm';

const row = {
  companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 10, due: 1_600_000, chargeCount: 20, adjustment: 0, refunded: 0,
  collected: 1_200_000, cashCollected: 1_200_000, received: 1_000_000, receiptCount: 1, remaining: 600_000, gap: -200_000, previousDebt: 0,
  overdue: false, collectionRate: 75, lowCollectionRate: false, remittedRate: 62.5, lowRemittedRate: false,
  progress: 'PARTIAL' as const, reconciliation: 'PENDING' as const, retained: 0, payable: 1_600_000, debtCollected: 0, communePaid: 0, communeOwed: 0, qrTotal: 0, qrTransport: 0, qrCollection: 0, cashTransport: 0, cashCollection: 0, holding: 0, entitled: 0, settled: false, lastPeriodDebt: 0,
};
const norm = { normalizer: (s: string) => s.replace(/\s+/g, ' ').trim() };

function setup() {
  const onSubmit = vi.fn();
  render(
    <AntApp>
      <IssueReceiptForm row={row} periodLabel="Tháng 10/2026" onSubmit={onSubmit} onCancel={() => {}} />
    </AntApp>,
  );
  return onSubmit;
}

describe('IssueReceiptForm', () => {
  it('điền sẵn số còn phải nộp; số tiền lớn hơn 0 và không vượt số đó', async () => {
    const onSubmit = setup();
    const ok = screen.getByRole('button', { name: 'Lập phiếu' });
    const amount = screen.getByLabelText('Số tiền');
    expect(amount).toHaveValue('600.000');
    // Xóa trắng thì ô về 0.
    await userEvent.clear(amount);
    await userEvent.click(ok);
    expect(await screen.findByText('Số tiền phải lớn hơn 0')).toBeInTheDocument();

    await userEvent.type(amount, '700000');
    await userEvent.click(ok);
    expect(await screen.findByText('Không vượt số còn phải nộp (600.000 đ)', norm)).toBeInTheDocument();

    await userEvent.clear(amount);
    await userEvent.type(amount, '0');
    await userEvent.click(ok);
    expect(await screen.findByText('Số tiền phải lớn hơn 0')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('đóng rồi mở phiếu công ty khác thì số tiền đúng số còn phải nộp của công ty đó, không giữ số cũ', async () => {
    const other = { ...row, companyId: 3, companyCode: 'DV03', companyName: 'Công ty Ba', remaining: 250_000 };
    const view = (r: typeof row | null) => (
      <AntApp>
        <IssueReceiptForm row={r} periodLabel="Tháng 10/2026" onSubmit={() => {}} onCancel={() => {}} />
      </AntApp>
    );
    const { rerender } = render(view(row));
    const amount = screen.getByLabelText('Số tiền');
    await userEvent.clear(amount);
    await userEvent.type(amount, '5000');

    rerender(view(null));
    rerender(view(other));
    await waitFor(() => expect(screen.getByLabelText('Số tiền')).toHaveValue('250.000'));
  });

  it('gửi phiếu nộp một phần bằng chuyển khoản, ngày mặc định hôm nay', async () => {
    const onSubmit = setup();
    await userEvent.clear(screen.getByLabelText('Số tiền'));
    await userEvent.type(screen.getByLabelText('Số tiền'), '400000');
    await userEvent.type(screen.getByLabelText('Số ủy nhiệm chi / mã giao dịch'), 'UNC-0925');
    await userEvent.click(screen.getByRole('button', { name: 'Lập phiếu' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        companyId: 1, periodId: 10, amount: 400_000, method: 'TRANSFER', receiptDate: dayjs().format('YYYY-MM-DD'),
        payerName: undefined, documentRef: 'UNC-0925', note: undefined,
      }),
    );
  });
});
