import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { pickDate } from '../../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const company = (over: object) => ({
  id: 1, code: 'DV01', name: 'Công ty MTĐT Đông Thạnh', contactName: 'Trần Hoàng Phúc', contactPhone: '0900000001',
  status: 'ACTIVE', validFrom: '2026-01-01', validTo: null, orgType: null, taxCode: null, address: null, email: null,
  communeContractNo: null, ...over,
});
const companies = [company({}), company({ id: 2, code: 'DV02', name: 'HTX Môi trường An Phú', status: 'INACTIVE' })];
const kv07 = {
  id: 100, areaId: 7, areaCode: 'KV07', areaName: 'Tổ dân phố 07', companyId: 1, companyCode: 'DV01',
  companyName: 'Công ty MTĐT Đông Thạnh', validFrom: '2026-09-01', validTo: null, note: null, decisionNo: null,
};
const period = {
  id: 9, code: '2026-09', periodType: 'MONTH', label: 'Tháng 09/2026', startDate: '2026-09-01', endDate: '2026-09-30',
  openDate: '2026-09-01', dueDate: '2026-09-25', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
  lockedAt: null, note: null,
};
const ledgerRow = {
  companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 9, due: 1_319_000, chargeCount: 19,
  collected: 609_000, cashCollected: 609_000, received: 0, settlementId: null, settlementCode: null, remaining: 919_000, gap: -209_000, previousDebt: 0,
  overdue: true, collectionRate: 30.3, lowCollectionRate: true, progress: 'OVERDUE', reconciliation: 'MISMATCH',
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
});
afterEach(() => vi.unstubAllGlobals());

function baseApi(extra: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, officer),
    'GET /api/masterdata/companies': () => jsonResponse(200, companies),
    'GET /api/masterdata/areas': () => jsonResponse(200, []),
    'GET /api/masterdata/area-assignments': () => jsonResponse(200, [kv07]),
    'GET /api/masterdata/periods': () => jsonResponse(200, [period]),
    'GET /api/remittance/ledger': () => jsonResponse(200, [ledgerRow]),
    ...extra,
  });
}

describe('Công ty (cán bộ xã)', () => {
  it('danh sách có số khu vực, lọc Ngừng hợp tác', async () => {
    baseApi();
    renderApp('/commune/companies');

    expect(await screen.findByRole('button', { name: 'DV01 · Công ty MTĐT Đông Thạnh' })).toBeInTheDocument();
    expect(screen.getByText('HTX Môi trường An Phú', { exact: false })).toBeInTheDocument();

    await userEvent.click(screen.getByText('Ngừng hợp tác', { selector: '.ant-segmented-item-label' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'DV01 · Công ty MTĐT Đông Thạnh' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'DV02 · HTX Môi trường An Phú' })).toBeInTheDocument();
  });

  it('chi tiết hiện khu vực phụ trách và tiến độ nộp của kỳ', async () => {
    baseApi();
    renderApp('/commune/companies');

    await userEvent.click(await screen.findByRole('button', { name: 'DV01 · Công ty MTĐT Đông Thạnh' }));
    const drawer = await screen.findByRole('dialog');

    expect(await within(drawer).findByText('KV07 · Tổ dân phố 07')).toBeInTheDocument();
    expect(await within(drawer).findByText('Quá hạn quyết toán')).toBeInTheDocument();
    expect(within(drawer).getByText('919.000 đ')).toBeInTheDocument();
  });

  it('cán bộ xã không có nút thêm / sửa công ty', async () => {
    baseApi();
    renderApp('/commune/companies');

    await userEvent.click(await screen.findByRole('button', { name: 'DV01 · Công ty MTĐT Đông Thạnh' }));
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: '+ Thêm công ty' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Sửa/ })).not.toBeInTheDocument();
  });

  it('quản trị thêm công ty gửi đúng dữ liệu, hạn đến trước hạn từ thì chặn', async () => {
    const fetchFn = baseApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, { ...officer, id: 1, username: 'admin', role: 'ADMIN' }),
      'GET /api/masterdata/tariffs': () => jsonResponse(200, []),
      'POST /api/masterdata/companies': () => jsonResponse(201, company({ id: 3, code: 'DV03', name: 'HTX Mới' })),
    });
    renderApp('/admin/config');
    await userEvent.click(await screen.findByRole('tab', { name: 'Công ty & địa bàn' }));

    await userEvent.click(await screen.findByRole('button', { name: '+ Thêm công ty' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Tên công ty'), 'HTX Mới');
    await userEvent.type(within(dialog).getByLabelText('Người đầu mối'), 'Người Mẫu C');
    await userEvent.type(within(dialog).getByLabelText('SĐT đầu mối'), '0900000099');
    pickDate(within(dialog).getByLabelText('Hiệu lực từ'), '01/10/2026');
    pickDate(within(dialog).getByLabelText('Hiệu lực đến'), '30/09/2026');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm công ty' }));
    expect(await within(dialog).findByText('Không được trước hiệu lực từ')).toBeInTheDocument();

    pickDate(within(dialog).getByLabelText('Hiệu lực đến'), '31/12/2026');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm công ty' }));

    await waitFor(() =>
      expect(fetchFn.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toBe(true),
    );
    const post = fetchFn.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse(String((post![1] as RequestInit).body))).toEqual({
      name: 'HTX Mới', contactName: 'Người Mẫu C', contactPhone: '0900000099', status: 'ACTIVE',
      validFrom: '2026-10-01', validTo: '2026-12-31',
    });
  });
});
