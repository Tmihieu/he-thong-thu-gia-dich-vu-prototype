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
    lastPaidAt: null,
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
    'GET /api/collection/collectors': () => jsonResponse(200, collectors),
    // collectorId=21 đã thu 1 khoản; collectorId khác chưa thu khoản nào.
    'GET /api/collection/company-work': (url) =>
      jsonResponse(
        200,
        url.includes('collectorId=21')
          ? [work(2, 'Hộ Bình', 7, 'PAID')]
          : url.includes('collectorId=')
            ? []
            : [work(1, 'Hộ An', 7), work(2, 'Hộ Bình', 7, 'PAID'), work(3, 'Hộ Cường', 9)],
      ),
    'GET /api/collection/collectors/21/payments': () =>
      jsonResponse(200, [{ id: 1, code: 'TT-1026-000001', paidAt: '2026-10-12T02:00:00Z', amount: 80_000, method: 'CASH',
        chargeId: 2, chargeCode: 'KT-2', periodCode: '2026-10', subjectCode: 'DTH-H000002', subjectName: 'Hộ Bình' }]),
    'GET /api/remittance/ledger': () =>
      jsonResponse(200, [{ companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 10,
        due: 1_600_000, chargeCount: 20, collected: 1_200_000, received: 1_000_000, receiptCount: 1, remaining: 600_000,
        gap: -200_000, previousDebt: 0, overdue: false, collectionRate: 75, lowCollectionRate: false, remittedRate: 62.5,
        lowRemittedRate: false, progress: 'PARTIAL', reconciliation: 'PENDING' }]),
    'GET /api/collection/cash/held': () =>
      jsonResponse(200, [
        { collectorId: 21, collectorUsername: 'thu07', collectorName: 'Nguyễn Thành Mẫu', collectedCash: 240_000,
          handedOver: 80_000, held: 160_000 },
        { collectorId: 22, collectorUsername: 'thu09', collectorName: 'Lê Văn Mẫu', collectedCash: 0, handedOver: 0, held: 0 },
      ]),
    'GET /api/collection/cash/handovers': () => jsonResponse(200, []),
    'POST /api/collection/cash/handovers': () =>
      jsonResponse(422, { code: 'HANDOVER_AMOUNT_INVALID', message: 'Số tiền bàn giao phải lớn hơn 0 và không vượt số đang giữ (160.000 đ).' }),
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

describe('Công ty: hộ của công ty', () => {
  it('lọc theo người đi thu gọi company-work?collectorId=; ghi thay chọn người đi thu', async () => {
    const fetchFn = api();
    renderApp('/company/assigned');

    expect(await screen.findByText('Hộ Cường')).toBeInTheDocument();
    expect(screen.getByText('3 hộ')).toBeInTheDocument();

    await pickOption(screen.getByRole('combobox', { name: 'Người đi thu' }), 'Nguyễn Thành Mẫu');
    await waitFor(() => expect(screen.queryByText('Hộ Cường')).not.toBeInTheDocument());
    expect(screen.getByText('1 hộ')).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes('/api/collection/company-work') && String(url).includes('collectorId=21'))).toBe(true);
    await userEvent.click(screen.getByRole('combobox', { name: 'Người đi thu' }).closest('.ant-select')!.querySelector('.ant-select-clear')!);

    await userEvent.click(await screen.findByRole('button', { name: 'Ghi thu Hộ Cường' }));
    const dialog = await screen.findByRole('dialog');
    await pickOption(within(dialog).getByLabelText('Người đi thu đã nhận tiền'), 'Lê Văn Mẫu · thu09');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận đã thu' }));

    await waitFor(() =>
      expect(lastPost(fetchFn, '/api/collection/payments')).toMatchObject({ chargeId: 3, amount: 80_000, method: 'CASH',
        collectorId: 22 }),
    );
  });

  it('không còn tab Phân tổ và Chuyển khoản chờ đối chiếu', async () => {
    api();
    renderApp('/company/assigned');
    await screen.findByText('Hộ Cường');
    expect(screen.queryByRole('tab', { name: 'Phân tổ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Chuyển khoản chờ đối chiếu' })).not.toBeInTheDocument();
  });

  it('tiến độ theo người đi thu: số hộ đã thu và lịch sử thu mở ra từ dòng', async () => {
    api();
    renderApp('/company/assigned');

    const row = (await screen.findByText('thu07')).closest('tr')!;
    await userEvent.click(row.querySelector('.ant-table-row-expand-icon')!);
    expect(await screen.findByText('TT-1026-000001')).toBeInTheDocument();
  });
});

describe('Công ty: tổng quan', () => {
  it('bấm thẻ số hộ / số tiền đã thu lọc hộ đã thu; bấm thẻ đã nộp về xã mở tab phiếu thu', async () => {
    api();
    renderApp('/company/assigned');

    await screen.findByText('Hộ Cường');
    await userEvent.click(screen.getByRole('button', { name: 'Xem chi tiết Số hộ đã thu' }));
    await waitFor(() => expect(screen.queryByText('Hộ Cường')).not.toBeInTheDocument());
    expect(screen.getByText('Hộ Bình')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem chi tiết Số tiền đã thu' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xem chi tiết Số tiền đã nộp về xã' }));
    expect(await screen.findByRole('tab', { name: 'Phiếu thu xã lập', selected: true })).toBeInTheDocument();
  });

  it('vòng tiến độ lấy đúng dòng sổ công ty; nhận tiền mặt lỗi thì hiện thông báo tiếng Việt từ máy chủ', async () => {
    const fetchFn = api();
    renderApp('/company/assigned');

    expect(await screen.findByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Nộp một phần')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhận tiền mặt Lê Văn Mẫu' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Nhận tiền mặt Nguyễn Thành Mẫu' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận đã nhận' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('không vượt số đang giữ (160.000 đ)');
    expect(lastPost(fetchFn, '/api/collection/cash/handovers')).toMatchObject({ collectorId: 21, amount: 160_000 });
  });
});
