import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { pickOption } from '../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const admin = { id: 1, username: 'admin', fullName: 'Quản trị hệ thống', role: 'ADMIN', companyId: null };
const tariffs = [
  {
    id: 1, code: 'BG-65-2026', legalBasis: 'QĐ 65/2026/QĐ-UBND', issuedDate: null, validFrom: '2026-09-01',
    validTo: '2027-06-30', status: 'ACTIVE', scopeNote: 'Số tạm', note: null,
    rates: [{ tariffGroup: 'HH_3_PLUS', collectionFee: 57000, transportFee: 23000, monthlyTotal: 80000, unitLabel: 'đ/hộ/tháng' }],
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
  it('tạo trùng kỳ thì hiện thông báo tiếng Việt từ máy chủ trong hộp thoại', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/periods': () => jsonResponse(200, [period]),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, tariffs),
      'POST /api/masterdata/periods': () =>
        jsonResponse(409, { code: 'PERIOD_ALREADY_EXISTS', message: 'Kỳ 2026-10 đã được mở trước đó.' }),
    });
    renderApp('/admin/config');

    expect(await screen.findByText('Tháng 09/2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Tạo kỳ dự thảo/ }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Năm'), { target: { value: '2026' } });
    await pickOption(within(dialog).getByRole('combobox', { name: 'Tháng' }), 'Tháng 10');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo kỳ dự thảo' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Kỳ 2026-10 đã được mở trước đó.');
    const post = fetchFn.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse(String((post![1] as RequestInit).body))).toEqual({ type: 'MONTH', year: 2026, number: 10 });
  });

  it('tạo kỳ dự thảo xong thì báo cán bộ xã sẽ mở kỳ', async () => {
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

    await userEvent.click(await screen.findByRole('button', { name: /Tạo kỳ dự thảo/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Năm'), { target: { value: '2026' } });
    await pickOption(within(dialog).getByRole('combobox', { name: 'Tháng' }), 'Tháng 10');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo kỳ dự thảo' }));

    expect(await screen.findByText(/Đã tạo kỳ dự thảo Tháng 10\/2026/)).toBeInTheDocument();
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

describe('Cấu hình · soạn và ban hành biểu giá', () => {
  const groups = ['HH_UP_TO_2', 'HH_3_PLUS', 'SMALL_UP_TO_126', 'SMALL_126_TO_250', 'SMALL_250_TO_500', 'BY_VOLUME'];
  const draft = {
    id: 2, code: 'BG-70-2027', legalBasis: 'QĐ 70/2026/QĐ-UBND', issuedDate: null, validFrom: '2027-01-01', validTo: null,
    status: 'DRAFT', scopeNote: null, note: null,
    rates: groups.map((g) => ({ tariffGroup: g, collectionFee: 30000, transportFee: 10000, monthlyTotal: 40000, unitLabel: 'đ/hộ/tháng' })),
  };

  it('sửa dự thảo gửi đủ các nhóm giá; bản đã ban hành không có nút Sửa (QĐ-L7)', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/periods': () => jsonResponse(200, []),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, [draft, ...tariffs]),
      'PUT /api/masterdata/tariffs/2': () => jsonResponse(200, draft),
    });
    renderApp('/admin/config');

    await userEvent.click(await screen.findByRole('tab', { name: 'Biểu giá' }));
    expect(await screen.findByText('BG-70-2027')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Sửa' })).toHaveLength(1);

    await userEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]!);
    const dialog = await screen.findByRole('dialog');
    const fee = within(dialog).getByLabelText('Thu gom HGĐ ≤ 2 người');
    await userEvent.clear(fee);
    await userEvent.type(fee, '35000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu dự thảo' }));

    await waitFor(() => expect(fetchFn.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'PUT')).toBe(true));
    const put = fetchFn.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT')!;
    const body = JSON.parse(String((put[1] as RequestInit).body));
    expect(body.rates).toHaveLength(6);
    expect(body.rates[0]).toMatchObject({ tariffGroup: 'HH_UP_TO_2', collectionFee: 35000, transportFee: 10000 });
    expect(body).toMatchObject({ legalBasis: 'QĐ 70/2026/QĐ-UBND', validFrom: '2027-01-01' });
  });

  it('ban hành dự thảo gọi API ban hành; lỗi từ máy chủ hiện tiếng Việt', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/periods': () => jsonResponse(200, []),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, [draft, ...tariffs]),
      'POST /api/masterdata/tariffs/2/issue': () =>
        jsonResponse(422, { code: 'TARIFF_PERIOD_ALREADY_OPEN', message: 'Đã mở Tháng 01/2027 theo biểu giá cũ.' }),
    });
    renderApp('/admin/config');

    await userEvent.click(await screen.findByRole('tab', { name: 'Biểu giá' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Ban hành' }));
    // Nút thứ hai là nút xác nhận trong Popconfirm.
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Ban hành' })).toHaveLength(2));
    await userEvent.click(screen.getAllByRole('button', { name: 'Ban hành' })[1]!);

    expect(await screen.findByText('Đã mở Tháng 01/2027 theo biểu giá cũ.')).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([url]) => String(url) === '/api/masterdata/tariffs/2/issue')).toBe(true);
  });

  it('biểu giá đã ban hành không có nút Sửa đơn giá (QĐ-L7)', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/periods': () => jsonResponse(200, []),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, [{ ...draft, status: 'ACTIVE', issuedDate: '2026-10-01' }]),
    });
    renderApp('/admin/config');
    await userEvent.click(await screen.findByRole('tab', { name: 'Biểu giá' }));
    expect(await screen.findByText('BG-70-2027')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument();
  });
});

// Tạm tắt tự tạo kỳ (PeriodRuleCard không hiển thị).
describe.skip('Cấu hình · tự tạo kỳ thu', () => {
  const rule = {
    enabled: false, periodType: 'MONTH', createDay: 25, remitDueDays: 10,
    updatedAt: '2026-10-01T00:00:00+07:00',
  };

  it('quản trị bật quy tắc, đổi ngày tạo kỳ và lưu; chạy thử báo lý do chưa tạo', async () => {
    let current = rule;
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/periods': () => jsonResponse(200, [period]),
      'GET /api/masterdata/periods/drafts': () => jsonResponse(200, []),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, tariffs),
      'GET /api/masterdata/period-rule': () => jsonResponse(200, current),
      'PUT /api/masterdata/period-rule': (_url, init) => {
        current = { ...JSON.parse(String(init.body)), updatedAt: '2026-10-04T10:00:00+07:00' };
        return jsonResponse(200, current);
      },
      'POST /api/masterdata/period-rule/run': () =>
        jsonResponse(200, { created: false, message: 'Chưa tới ngày tạo kỳ: từ ngày 1 hằng tháng.', period: null }),
    });
    renderApp('/admin/config');

    const day = await screen.findByLabelText('Ngày tạo kỳ (hằng tháng)');
    expect(day).toHaveValue('25');
    await userEvent.click(screen.getByRole('switch'));
    await userEvent.clear(day);
    await userEvent.type(day, '1');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu quy tắc' }));

    await waitFor(() => {
      const put = fetchFn.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');
      expect(JSON.parse(String((put![1] as RequestInit).body))).toEqual({
        enabled: true, periodType: 'MONTH', createDay: 1, remitDueDays: 10,
      });
    });
    expect(await screen.findByText('Đã lưu quy tắc tự tạo kỳ')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Chạy thử ngay' }));
    expect(await screen.findByText('Chưa tới ngày tạo kỳ: từ ngày 1 hằng tháng.')).toBeInTheDocument();
  });

  it('sửa quy tắc chưa lưu thì khóa nút Chạy thử để không chạy theo giá trị cũ', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/periods': () => jsonResponse(200, [period]),
      'GET /api/masterdata/periods/drafts': () => jsonResponse(200, []),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, tariffs),
      'GET /api/masterdata/period-rule': () => jsonResponse(200, rule),
    });
    renderApp('/admin/config');

    const run = await screen.findByRole('button', { name: 'Chạy thử ngay' });
    expect(run).toBeEnabled();
    await userEvent.click(screen.getByText('Quý'));
    expect(run).toBeDisabled();
  });
});
