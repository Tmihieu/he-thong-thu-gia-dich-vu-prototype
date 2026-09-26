import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const areas = [
  { id: 7, code: 'KV07', name: 'Tổ dân phố 07', districtId: 1, districtCode: 'DTH', status: 'ACTIVE' },
  { id: 24, code: 'KV24', name: 'Tổ dân phố 24', districtId: 3, districtCode: 'NB', status: 'ACTIVE' },
];
const districts = [
  { id: 1, code: 'DTH', name: 'Đông Thạnh', note: null, sortOrder: 1 },
  { id: 3, code: 'NB', name: 'Nhị Bình', note: null, sortOrder: 3 },
];
const companies = [
  { id: 1, code: 'DV01', name: 'Công ty MTĐT Đông Thạnh', contactName: 'A', contactPhone: '0900000001', status: 'ACTIVE',
    validFrom: '2026-01-01', validTo: null, orgType: null, taxCode: null, address: null, email: null,
    communeContractNo: null, bankAccount: null, bankName: null },
];
const kv07 = {
  id: 100, areaId: 7, areaCode: 'KV07', areaName: 'Tổ dân phố 07', companyId: 1, companyCode: 'DV01',
  companyName: 'Công ty MTĐT Đông Thạnh', validFrom: '2026-09-01', validTo: '2026-12-31', note: null, decisionNo: null,
};
const kv24 = { ...kv07, id: 101, areaId: 24, areaCode: 'KV24', areaName: 'Tổ dân phố 24', validFrom: '2026-10-01', validTo: null };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
});
afterEach(() => vi.unstubAllGlobals());

function baseApi(active: () => unknown[], extra: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, officer),
    'GET /api/masterdata/areas': () => jsonResponse(200, areas),
    'GET /api/masterdata/districts': () => jsonResponse(200, districts),
    'GET /api/masterdata/companies': () => jsonResponse(200, companies),
    'GET /api/masterdata/area-assignments': () => jsonResponse(200, active()),
    ...extra,
  });
}

async function fillAndSubmit(dialog: HTMLElement) {
  fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Công ty phụ trách' }));
  fireEvent.click(await screen.findByTitle('DV01 · Công ty MTĐT Đông Thạnh'));
  const from = within(dialog).getByLabelText('Từ ngày');
  await userEvent.type(from, '01/10/2026');
  fireEvent.keyDown(from, { key: 'Enter', code: 'Enter' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Phân công' }));
}

describe('Khu vực (cán bộ xã)', () => {
  it('hiện công ty phụ trách, đánh dấu tổ chưa có công ty và lọc được', async () => {
    baseApi(() => [kv07]);
    renderApp('/commune/areas');

    expect(await screen.findByText('KV07 · Tổ dân phố 07')).toBeInTheDocument();
    expect(screen.getByText('DV01 · Công ty MTĐT Đông Thạnh')).toBeInTheDocument();
    expect(screen.getByText('1 tổ chưa có công ty')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Chỉ tổ chưa có công ty' }));
    await waitFor(() => expect(screen.queryByText('KV07 · Tổ dân phố 07')).not.toBeInTheDocument());
    expect(screen.getByText('KV24 · Tổ dân phố 24')).toBeInTheDocument();
  });

  it('popup chưa chọn công ty và ngày thì báo lỗi, không gửi', async () => {
    const fetchFn = baseApi(() => [kv07]);
    renderApp('/commune/areas');

    await userEvent.click(await screen.findByRole('button', { name: 'Phân công KV24' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Phân công' }));

    expect(await within(dialog).findByText('Vui lòng chọn công ty')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng chọn ngày bắt đầu')).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toBe(false);
  });

  it('lỗi quy tắc từ máy chủ hiện tiếng Việt trong popup', async () => {
    baseApi(() => [kv07], {
      'POST /api/masterdata/area-assignments': () =>
        jsonResponse(422, { code: 'ASSIGNMENT_OVERLAP', message: 'Khu vực KV24 đã có phân công bắt đầu đúng ngày 01/10/2026.' }),
    });
    renderApp('/commune/areas');

    await userEvent.click(await screen.findByRole('button', { name: 'Phân công KV24' }));
    const dialog = await screen.findByRole('dialog');
    await fillAndSubmit(dialog);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('đã có phân công bắt đầu đúng ngày 01/10/2026');
  });

  it('phân công KV24 thành công thì gửi đúng dữ liệu và bảng cập nhật', async () => {
    let active: unknown[] = [kv07];
    const fetchFn = baseApi(() => active, {
      'POST /api/masterdata/area-assignments': () => {
        active = [kv07, kv24];
        return jsonResponse(201, [kv24]);
      },
    });
    renderApp('/commune/areas');

    await userEvent.click(await screen.findByRole('button', { name: 'Phân công KV24' }));
    await fillAndSubmit(await screen.findByRole('dialog'));

    await waitFor(() => expect(screen.queryByText('1 tổ chưa có công ty')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Phân công KV24' })).toHaveTextContent('Đổi công ty');
    const post = fetchFn.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse(String((post![1] as RequestInit).body))).toEqual({ areaIds: [24], companyId: 1, fromDate: '2026-10-01' });
  });

  it('bấm tên tổ mở lịch sử phân công', async () => {
    baseApi(() => [kv07], {
      'GET /api/masterdata/areas/7/assignments': () =>
        jsonResponse(200, [kv07, { ...kv07, id: 90, companyCode: 'DV03', companyName: 'Công ty Ba', validFrom: '2026-06-01', validTo: '2026-08-31' }]),
    });
    renderApp('/commune/areas');

    await userEvent.click(await screen.findByRole('button', { name: 'KV07 · Tổ dân phố 07' }));

    expect(await screen.findByText('Lịch sử phân công · KV07')).toBeInTheDocument();
    expect(await screen.findByText('DV03 · Công ty Ba')).toBeInTheDocument();
    expect(screen.getByText('31/08/2026')).toBeInTheDocument();
  });
});
