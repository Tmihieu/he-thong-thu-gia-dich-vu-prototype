import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { pickOption } from '../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const manager = { id: 11, username: 'dv01', fullName: 'Trần Văn Mẫu', role: 'COMPANY_MANAGER', companyId: 1 };
const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const leader = { id: 3, username: 'lanhdao', fullName: 'Lãnh đạo xã', role: 'LEADER', companyId: null };
const periods = [
  { id: 10, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
    lockedAt: null, note: null },
];
const payout = (id: number, code: string, amount: number, cumulativePaid: number) => ({
  id, code, companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 10, periodCode: '2026-10',
  periodLabel: 'Tháng 10/2026', amount, amountInWords: '', method: 'CASH', payoutDate: '2026-10-15', documentRef: 'PC-1',
  note: null, cumulativePaid, periodOwed: 228_000, remainingAfter: 228_000 - cumulativePaid,
});
const issue = {
  id: 5, payoutId: 41, payoutCode: 'PC-CT-1026-002', payoutAmount: 28_000, companyId: 1, companyCode: 'DV01',
  companyName: 'Công ty MTĐT Đông Thạnh', periodLabel: 'Tháng 10/2026', issueType: 'WRONG_AMOUNT', correctAmount: 30_000,
  description: 'Nhận 30.000 đ, phiếu ghi 28.000 đ', status: 'PENDING', reportedAt: '2026-10-16T02:00:00Z', resolvedAt: null,
  resolutionNote: null,
};
const ledgerRow = {
  companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 10, due: 1_000_000, chargeCount: 10, adjustment: 0,
  refunded: 0, collected: 1_000_000, cashCollected: 0, received: 0, receiptCount: 0, remaining: -228_000, gap: 228_000, previousDebt: 0,
  overdue: false, collectionRate: 100, lowCollectionRate: false, remittedRate: 0, lowRemittedRate: false, progress: 'PAID_IN_FULL',
  reconciliation: 'PENDING', retained: 228_000, payable: -228_000, debtCollected: 0, communePaid: 100_000, communeOwed: 128_000,
};

afterEach(() => vi.unstubAllGlobals());

function lastBody(fetchFn: ReturnType<typeof mockApi>, path: string) {
  const call = fetchFn.mock.calls.filter(([url, init]) => String(url) === path && (init as RequestInit | undefined)?.method === 'POST').at(-1);
  return call ? JSON.parse(String((call[1] as RequestInit).body)) : undefined;
}

describe('Công ty: phiếu xã trả lại', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(TOKEN_KEY, 'tok-dv01');
  });

  it('phiếu đã báo hiện "chờ xã kiểm tra"; báo sai sót phiếu khác gửi payoutId', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, manager),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/receipts': () => jsonResponse(200, []),
      'GET /api/remittance/receipt-issues': () => jsonResponse(200, []),
      'GET /api/remittance/ledger': () => jsonResponse(200, [ledgerRow]),
      'GET /api/remittance/payouts': () => jsonResponse(200, [payout(40, 'PC-CT-1026-001', 72_000, 72_000), payout(41, 'PC-CT-1026-002', 28_000, 100_000)]),
      'GET /api/remittance/payout-issues': () => jsonResponse(200, [issue]),
      'POST /api/remittance/payout-issues': () => jsonResponse(201, { ...issue, id: 6, payoutId: 40 }),
    });
    renderApp('/company/assigned');
    await userEvent.click(await screen.findByRole('tab', { name: 'Phiếu thu xã lập' }));

    const reported = (await screen.findByRole('button', { name: 'Báo sai sót PC-CT-1026-002' })).closest('tr')!;
    expect(within(reported).getByText('Đã báo sai sót · chờ xã kiểm tra')).toBeInTheDocument();
    expect(within(reported).getByRole('button', { name: 'Báo sai sót PC-CT-1026-002' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Báo sai sót PC-CT-1026-001' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo sai sót' }));
    expect(await within(dialog).findByText('Vui lòng chọn loại sai sót')).toBeInTheDocument();
    await pickOption(within(dialog).getByRole('combobox'), 'Sai chứng từ');
    await userEvent.type(within(dialog).getByLabelText('Mô tả'), 'Số chứng từ sai');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo sai sót' }));

    await waitFor(() =>
      expect(lastBody(fetchFn, '/api/remittance/payout-issues')).toEqual({
        payoutId: 40, issueType: 'WRONG_DOCUMENT', correctAmount: null, description: 'Số chứng từ sai',
      }),
    );
  });
});

describe('Xã: sai sót phiếu chi trả', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
  });

  it('xử lý bắt buộc ghi kết quả rồi gửi ghi chú', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/billing/charge-requests': () => jsonResponse(200, []),
      'GET /api/remittance/payout-issues': () => jsonResponse(200, [issue]),
      'POST /api/remittance/payout-issues/5/resolve': () => jsonResponse(200, { ...issue, status: 'RESOLVED', resolutionNote: 'Đúng' }),
    });
    renderApp('/commune/charges?tab=payout-issues');

    await userEvent.click(await screen.findByRole('button', { name: 'Xử lý' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đánh dấu đã xử lý' }));
    expect(await within(dialog).findByText('Vui lòng ghi kết quả xử lý')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Kết quả xử lý'), 'Đã kiểm tra sao kê');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đánh dấu đã xử lý' }));

    await waitFor(() =>
      expect(lastBody(fetchFn, '/api/remittance/payout-issues/5/resolve')).toEqual({ resolutionNote: 'Đã kiểm tra sao kê' }),
    );
  });
});

describe('Lãnh đạo: phiếu chi trả', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(TOKEN_KEY, 'tok-leader');
  });

  it('chỉ xem: có danh sách công ty xã phải trả, không có nút Lập phiếu chi', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, leader),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/ledger': () => jsonResponse(200, [ledgerRow]),
    });
    renderApp('/leader/payouts');

    expect(await screen.findByRole('cell', { name: /DV01/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lập phiếu chi/ })).not.toBeInTheDocument();
  });
});
