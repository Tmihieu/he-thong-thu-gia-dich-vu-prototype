import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import { vi } from 'vitest';

import { IssueReceiptForm } from './IssueReceiptForm';

const row = {
  companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 10, due: 1_600_000, chargeCount: 20,
  collected: 1_200_000, received: 1_000_000, receiptCount: 1, remaining: 600_000, gap: -200_000, previousDebt: 0,
  overdue: false, collectionRate: 75, lowCollectionRate: false, progress: 'PARTIAL' as const, reconciliation: 'PENDING' as const,
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
  it('số tiền bắt buộc, lớn hơn 0 và không vượt số còn phải nộp', async () => {
    const onSubmit = setup();
    const ok = screen.getByRole('button', { name: 'Lập phiếu' });
    await userEvent.click(ok);
    expect(await screen.findByText('Vui lòng nhập số tiền')).toBeInTheDocument();

    const amount = screen.getByLabelText('Số tiền');
    await userEvent.type(amount, '700000');
    await userEvent.click(ok);
    expect(await screen.findByText('Không vượt số còn phải nộp (600.000 đ)', norm)).toBeInTheDocument();

    await userEvent.clear(amount);
    await userEvent.type(amount, '0');
    await userEvent.click(ok);
    expect(await screen.findByText('Số tiền phải lớn hơn 0')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('gửi phiếu nộp một phần bằng chuyển khoản, ngày mặc định hôm nay', async () => {
    const onSubmit = setup();
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
