import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import { vi } from 'vitest';

import type { LedgerRow } from '../api';
import { SettlementForm } from './SettlementForm';

const row: LedgerRow = {
  companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 10, due: 1_600_000, chargeCount: 20, adjustment: 0, refunded: 0,
  collected: 1_200_000, cashCollected: 1_200_000, received: 0, settlementId: null, settlementCode: null, remaining: 600_000, gap: -600_000, previousDebt: 0,
  overdue: false, collectionRate: 75, lowCollectionRate: false, remittedRate: 0, lowRemittedRate: false,
  progress: 'NOT_PAID', reconciliation: 'PENDING', retained: 0, payable: 600_000, debtCollected: 0, communePaid: 0, communeOwed: 0, qrTotal: 300_000, qrTransport: 0, qrCollection: 100_000, qrProcessing: 0, cashTransport: 0, cashCollection: 0, cashProcessing: 0, holding: 0, entitled: 0, settled: false, lastPeriodDebt: 0,
};

function setup(r: LedgerRow) {
  const onSubmit = vi.fn();
  render(
    <AntApp>
      <SettlementForm row={r} periodLabel="Tháng 10/2026" onSubmit={onSubmit} onCancel={() => {}} />
    </AntApp>,
  );
  return onSubmit;
}

describe('SettlementForm', () => {
  it('hiện công ty phải nộp, xã phải trả, chênh lệch; gửi chuyển khoản, ngày mặc định hôm nay', async () => {
    const onSubmit = setup(row);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('700.000 đ')).toBeInTheDocument();
    expect(within(dialog).getByText('100.000 đ')).toBeInTheDocument();
    expect(within(dialog).getByText(/Công ty nộp xã/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Số ủy nhiệm chi / mã giao dịch'), 'UNC-0925');
    await userEvent.click(screen.getByRole('button', { name: 'Lập phiếu' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        companyId: 1, periodId: 10, method: 'TRANSFER', settleDate: dayjs().format('YYYY-MM-DD'),
        representativeName: undefined, documentRef: 'UNC-0925', note: undefined,
      }),
    );
  });

  it('chênh lệch bằng 0 thì ẩn hình thức, không gửi hình thức', async () => {
    const onSubmit = setup({ ...row, payable: 0 });
    expect(screen.getByText(/Không chuyển tiền/)).toBeInTheDocument();
    expect(screen.queryByText('Hình thức')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lập phiếu' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ method: undefined })));
  });
});
