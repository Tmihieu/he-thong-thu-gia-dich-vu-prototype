import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { pickDate, pickOption } from '../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const admin = { id: 1, username: 'admin', fullName: 'Quản trị hệ thống', role: 'ADMIN', companyId: null };
const tariffs = [
  {
    id: 1, code: 'BG-65-2026', legalBasis: 'QĐ 65/2026/QĐ-UBND', issuedDate: null, validFrom: '2026-09-01',
    validTo: '2027-06-30', status: 'ACTIVE', scopeNote: 'Số tạm', note: null,
    rates: [{ tariffGroup: 'HH_3_PLUS', collectionFee: 57000, processingFee: 23000, monthlyTotal: 80000, unitLabel: 'đ/hộ/tháng' }],
  },
];
const period = {
  id: 7, code: '2026-09', periodType: 'MONTH', label: 'Tháng 09/2026', startDate: '2026-09-01', endDate: '2026-09-30',
  openDate: '2026-09-01', dueDate: '2026-09-30', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
  lockedAt: null, note: null,
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-admin');
});
afterEach(() => vi.unstubAllGlobals());

describe('Cấu hình · kỳ thu', () => {
  it('mở trùng kỳ thì hiện thông báo tiếng Việt từ máy chủ trong hộp thoại', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/periods': () => jsonResponse(200, [period]),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, tariffs),
      'POST /api/masterdata/periods': () =>
        jsonResponse(409, { code: 'PERIOD_ALREADY_EXISTS', message: 'Kỳ 2026-10 đã được mở trước đó.' }),
    });
    renderApp('/admin/config');

    expect(await screen.findByText('Tháng 09/2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Mở kỳ/ }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Năm'), { target: { value: '2026' } });
    await pickOption(within(dialog).getByRole('combobox', { name: 'Tháng' }), 'Tháng 10');
    pickDate(within(dialog).getByLabelText('Hạn công ty nộp xã'), '31/10/2026');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mở kỳ' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Kỳ 2026-10 đã được mở trước đó.');
    const post = fetchFn.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse(String((post![1] as RequestInit).body))).toMatchObject({ type: 'MONTH', number: 10, dueDate: '2026-10-31' });
  });

  it('mở kỳ xong thì kỳ ở trạng thái "Đang thu" ngay, không có bước "Bắt đầu thu"', async () => {
    const october = { ...period, id: 8, code: '2026-10', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31' };
    let list: unknown[] = [];
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/periods': () => jsonResponse(200, list),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, tariffs),
      'POST /api/masterdata/periods': () => {
        list = [october];
        return jsonResponse(201, october);
      },
    });
    renderApp('/admin/config');

    await userEvent.click(await screen.findByRole('button', { name: /Mở kỳ/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Năm'), { target: { value: '2026' } });
    await pickOption(within(dialog).getByRole('combobox', { name: 'Tháng' }), 'Tháng 10');
    pickDate(within(dialog).getByLabelText('Hạn công ty nộp xã'), '31/10/2026');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mở kỳ' }));

    expect(await screen.findByText('Tháng 10/2026')).toBeInTheDocument();
    expect(screen.getByText('Đang thu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bắt đầu thu' })).not.toBeInTheDocument();
  });

  it('tab biểu giá hiện phiên bản và đơn giá theo nhóm', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/periods': () => jsonResponse(200, []),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, tariffs),
    });
    renderApp('/admin/config');

    await userEvent.click(await screen.findByRole('tab', { name: 'Biểu giá' }));
    expect(await screen.findByText('BG-65-2026')).toBeInTheDocument();
    expect(screen.getByText('Đang áp dụng')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /mở rộng|expand/i }));
    await waitFor(() => expect(screen.getByText('HGĐ ≥ 3 người')).toBeInTheDocument());
    expect(screen.getByText(/80\.000/)).toBeInTheDocument();
  });
});
