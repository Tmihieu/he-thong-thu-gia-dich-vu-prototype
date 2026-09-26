import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { pickOption } from '../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const manager = { id: 11, username: 'dv01', fullName: 'Trần Văn Mẫu', role: 'COMPANY_MANAGER', companyId: 1 };
const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const periods = [
  { id: 10, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
    lockedAt: null, note: null },
];
const receipt = (id: number, code: string, amount: number, cumulativePaid: number) => ({
  id, code, companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 10, periodCode: '2026-10',
  periodLabel: 'Tháng 10/2026', amount, amountInWords: '', method: 'TRANSFER', receiptDate: '2026-10-15', payerName: 'Trần Văn Mẫu',
  documentRef: 'UNC-1', note: null, status: 'RECORDED', cumulativePaid, periodDue: 1_600_000,
  remainingAfter: 1_600_000 - cumulativePaid,
});
const issue = {
  id: 5, receiptId: 31, receiptCode: 'PT-CT-1026-002', receiptAmount: 200_000, companyId: 1, companyCode: 'DV01',
  companyName: 'Công ty MTĐT Đông Thạnh', periodLabel: 'Tháng 10/2026', issueType: 'WRONG_AMOUNT', correctAmount: 250_000,
  description: 'Chuyển 250.000 đ, phiếu ghi 200.000 đ', status: 'PENDING', reportedAt: '2026-10-16T02:00:00Z', resolvedAt: null,
  resolutionNote: null,
};

afterEach(() => vi.unstubAllGlobals());

function lastBody(fetchFn: ReturnType<typeof mockApi>, path: string) {
  const call = fetchFn.mock.calls.filter(([url, init]) => String(url) === path && (init as RequestInit | undefined)?.method === 'POST').at(-1);
  return call ? JSON.parse(String((call[1] as RequestInit).body)) : undefined;
}

describe('Công ty: phiếu thu xã lập', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(TOKEN_KEY, 'tok-dv01');
  });

  function api() {
    return mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, manager),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/receipts': () =>
        jsonResponse(200, [receipt(30, 'PT-CT-1026-001', 1_000_000, 1_000_000), receipt(31, 'PT-CT-1026-002', 200_000, 1_200_000)]),
      'GET /api/remittance/receipt-issues': () => jsonResponse(200, [issue]),
      'POST /api/remittance/receipt-issues': () => jsonResponse(201, { ...issue, id: 6, receiptId: 30 }),
    });
  }

  it('phiếu đã báo hiện "chờ xã kiểm tra" và không báo lại được; form bắt buộc loại và mô tả', async () => {
    const fetchFn = api();
    renderApp('/company/assigned');
    await userEvent.click(await screen.findByRole('tab', { name: 'Phiếu thu xã lập' }));

    const [first, reported] = (await screen.findAllByRole('button', { name: 'Báo sai sót' })).map((b) => b.closest('tr')!);
    expect(within(first!).getByText('PT-CT-1026-001')).toBeInTheDocument();
    expect(within(reported!).getByText('Đã báo sai sót · chờ xã kiểm tra')).toBeInTheDocument();
    expect(within(reported!).getByRole('button', { name: 'Báo sai sót' })).toBeDisabled();

    await userEvent.click(within(first!).getByRole('button', { name: 'Báo sai sót' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo sai sót' }));
    expect(await within(dialog).findByText('Vui lòng chọn loại sai sót')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng mô tả sai sót')).toBeInTheDocument();
    expect(lastBody(fetchFn, '/api/remittance/receipt-issues')).toBeUndefined();

    await pickOption(within(dialog).getByRole('combobox'), 'Sai số tiền');
    await userEvent.type(await within(dialog).findByLabelText('Số tiền đúng'), '1050000');
    await userEvent.type(within(dialog).getByLabelText('Mô tả'), 'Chuyển 1.050.000 đ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo sai sót' }));

    await waitFor(() =>
      expect(lastBody(fetchFn, '/api/remittance/receipt-issues')).toEqual({
        receiptId: 30, issueType: 'WRONG_AMOUNT', correctAmount: 1_050_000, description: 'Chuyển 1.050.000 đ',
      }),
    );
  });

  it('loại khác "Sai số tiền" thì không gửi số đúng', async () => {
    const fetchFn = api();
    renderApp('/company/assigned');
    await userEvent.click(await screen.findByRole('tab', { name: 'Phiếu thu xã lập' }));

    await userEvent.click((await screen.findAllByRole('button', { name: 'Báo sai sót' }))[0]!);
    const dialog = await screen.findByRole('dialog');
    await pickOption(within(dialog).getByRole('combobox'), 'Sai chứng từ');
    expect(within(dialog).queryByLabelText('Số tiền đúng')).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Mô tả'), 'Số UNC sai');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo sai sót' }));

    await waitFor(() =>
      expect(lastBody(fetchFn, '/api/remittance/receipt-issues')).toEqual({
        receiptId: 30, issueType: 'WRONG_DOCUMENT', correctAmount: null, description: 'Số UNC sai',
      }),
    );
  });
});

describe('Xã: sai sót phiếu thu', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
  });

  it('xử lý bắt buộc ghi kết quả rồi gửi ghi chú', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/billing/charge-requests': () => jsonResponse(200, []),
      'GET /api/remittance/receipt-issues': () => jsonResponse(200, [issue]),
      'POST /api/remittance/receipt-issues/5/resolve': () =>
        jsonResponse(200, { ...issue, status: 'RESOLVED', resolutionNote: 'Đã lập phiếu bổ sung' }),
    });
    renderApp('/commune/charges');

    await userEvent.click(await screen.findByRole('tab', { name: 'Sai sót phiếu thu' }));
    const row = (await screen.findByText('Chuyển 250.000 đ, phiếu ghi 200.000 đ', { selector: 'td' })).closest('tr')!;
    await waitFor(() =>
      expect(fetchFn.mock.calls.some(([url]) => String(url) === '/api/remittance/receipt-issues?status=PENDING')).toBe(true),
    );
    await userEvent.click(within(row).getByRole('button', { name: 'Xử lý' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Sai số tiền')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Đánh dấu đã xử lý' }));
    expect(await within(dialog).findByText('Vui lòng ghi kết quả xử lý')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Kết quả xử lý'), 'Đã lập phiếu bổ sung');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đánh dấu đã xử lý' }));
    await waitFor(() =>
      expect(lastBody(fetchFn, '/api/remittance/receipt-issues/5/resolve')).toEqual({ resolutionNote: 'Đã lập phiếu bổ sung' }),
    );
  });
});
