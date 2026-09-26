import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { pickOption } from '../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const manager = { id: 11, username: 'dv01', fullName: 'Trần Văn Mẫu', role: 'COMPANY_MANAGER', companyId: 1 };
const periods = [
  { id: 10, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
    lockedAt: null, note: null },
];
const collectors = [
  { id: 21, username: 'thu07', fullName: 'Nguyễn Thành Mẫu', phone: null, active: true },
  { id: 22, username: 'thu09', fullName: 'Lê Văn Mẫu', phone: null, active: true },
];
const areaAssignments = [7, 9, 12].map((n) => ({
  id: n, areaId: n, areaCode: `KV${String(n).padStart(2, '0')}`, areaName: `Tổ dân phố ${n}`, companyId: 1, companyCode: 'DV01',
  companyName: 'Công ty MTĐT Đông Thạnh', validFrom: '2026-09-01', validTo: null, note: null, decisionNo: null,
}));
const collectorAssignments = [
  { id: 1, collectorId: 21, collectorUsername: 'thu07', collectorName: 'Nguyễn Thành Mẫu', areaId: 7, areaCode: 'KV07',
    areaName: 'Tổ dân phố 7', companyId: 1, validFrom: '2026-09-01', validTo: null, note: null },
  { id: 2, collectorId: 22, collectorUsername: 'thu09', collectorName: 'Lê Văn Mẫu', areaId: 9, areaCode: 'KV09',
    areaName: 'Tổ dân phố 9', companyId: 1, validFrom: '2026-09-01', validTo: null, note: null },
];

function work(id: number, name: string, areaId: number, status = 'UNPAID') {
  return {
    charge: {
      id, code: `KT-${id}`, requestCode: 'YCT-1026-001', subjectId: id, subjectCode: `DTH-H00000${id}`, subjectName: name,
      subjectAddress: `${id} Đường Mẫu`, areaId, areaCode: `KV${String(areaId).padStart(2, '0')}`, companyId: 1, companyCode: 'DV01',
      periodId: 10, periodCode: '2026-10', feeTypeCode: 'ENV', tariffGroup: 'HH_3_PLUS', unitPrice: 80_000, months: 1,
      amount: 80_000, dueDate: '2026-10-25', status, overdue: false,
    },
    paidAmount: status === 'PAID' ? 80_000 : 0,
    remainingAmount: status === 'PAID' ? 0 : 80_000,
    lastVisit: null,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-dv01');
});
afterEach(() => vi.unstubAllGlobals());

function api() {
  return mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, manager),
    'GET /api/masterdata/periods': () => jsonResponse(200, periods),
    'GET /api/masterdata/area-assignments': () => jsonResponse(200, areaAssignments),
    'GET /api/collection/collectors': () => jsonResponse(200, collectors),
    'GET /api/collection/collector-assignments': () => jsonResponse(200, collectorAssignments),
    'GET /api/collection/company-work': () =>
      jsonResponse(200, [work(1, 'Hộ An', 7), work(2, 'Hộ Bình', 7, 'PAID'), work(3, 'Hộ Cường', 9)]),
    'POST /api/collection/collector-assignments': (_url, init) => {
      const body = JSON.parse(String(init.body)) as { areaIds: number[] };
      return jsonResponse(201, body.areaIds.map((areaId, i) => ({ ...collectorAssignments[0]!, id: 10 + i, areaId })));
    },
    'POST /api/collection/payments': () =>
      jsonResponse(201, {
        payment: { id: 1, code: 'TT-1026-000001', amount: 80_000, method: 'CASH', paidAt: '2026-10-12T02:00:00Z',
          collectorId: 22, note: null },
        chargeCode: 'KT-3', chargeStatus: 'PAID', paidAmount: 80_000, remainingAmount: 0, replayed: false,
      }),
  });
}

function lastPost(fetchFn: ReturnType<typeof mockApi>, path: string) {
  const call = fetchFn.mock.calls.filter(([url, init]) => String(url) === path && (init as RequestInit | undefined)?.method === 'POST').at(-1);
  return call ? (JSON.parse(String((call[1] as RequestInit).body)) as Record<string, unknown>) : undefined;
}

describe('Công ty: hộ được giao', () => {
  it('hiện người đi thu theo tổ, lọc theo người đi thu; ghi thay mặc định người phụ trách tổ', async () => {
    const fetchFn = api();
    renderApp('/company/assigned');

    const row = (await screen.findByText('Hộ Cường')).closest('tr')!;
    expect(within(row).getByText('Lê Văn Mẫu')).toBeInTheDocument();
    expect(screen.getByText('3 hộ')).toBeInTheDocument();

    await pickOption(screen.getByRole('combobox', { name: 'Người đi thu' }), 'Nguyễn Thành Mẫu');
    expect(screen.queryByText('Hộ Cường')).not.toBeInTheDocument();
    expect(screen.getByText('2 hộ')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Người đi thu' }).closest('.ant-select')!.querySelector('.ant-select-clear')!);

    await userEvent.click(await screen.findByRole('button', { name: 'Cập nhật Hộ Cường' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTitle('Lê Văn Mẫu · thu09')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() =>
      expect(lastPost(fetchFn, '/api/collection/payments')).toMatchObject({ chargeId: 3, amount: 80_000, method: 'CASH',
        collectorId: 22 }),
    );
  });
});

describe('Công ty: phân tổ', () => {
  it('tổ chưa phân hiện cảnh báo; gán người đi thu cho tổ gửi đúng yêu cầu', async () => {
    const fetchFn = api();
    renderApp('/company/assigned');
    await userEvent.click(await screen.findByRole('tab', { name: 'Phân tổ' }));

    const kv12 = (await screen.findByText('KV12 · Tổ dân phố 12')).closest('tr')!;
    expect(within(kv12).getByText('Chưa phân')).toBeInTheDocument();
    await userEvent.click(within(kv12).getByRole('button', { name: 'Phân tổ KV12' }));
    const dialog = await screen.findByRole('dialog');
    await pickOption(within(dialog).getByLabelText('Người đi thu'), 'Nguyễn Thành Mẫu · thu07');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Phân tổ' }));

    await waitFor(() =>
      expect(lastPost(fetchFn, '/api/collection/collector-assignments')).toMatchObject({ collectorId: 21, areaIds: [12] }),
    );
    expect(await screen.findByText('Đã phân 1 tổ cho Nguyễn Thành Mẫu')).toBeInTheDocument();
  });
});
