import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { pickDate } from '../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const collector = { id: 21, username: 'thu07', fullName: 'Nguyễn Thành Mẫu', role: 'COLLECTOR', companyId: 1 };
const periods = [
  { id: 10, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
    lockedAt: null, note: null },
];

function work(id: number, name: string, extra: { status?: string; paid?: number; lastVisit?: unknown; overdue?: boolean } = {}) {
  const amount = 80_000;
  const paid = extra.paid ?? (extra.status === 'PAID' ? amount : 0);
  return {
    charge: {
      id, code: `KT-1026-DTH-H00012${id}`, requestCode: 'YCT-1026-001', subjectId: id, subjectCode: `DTH-H00012${id}`,
      subjectName: name, subjectAddress: `${id} Đường Mẫu`, areaId: 7, areaCode: 'KV07', companyId: 1, companyCode: 'DV01',
      periodId: 10, periodCode: '2026-10', feeTypeCode: 'ENV', tariffGroup: 'HH_3_PLUS', unitPrice: amount, months: 1, amount,
      dueDate: '2026-10-25', status: extra.status ?? 'UNPAID', overdue: extra.overdue ?? false,
    },
    paidAmount: paid,
    remainingAmount: amount - paid,
    lastVisit: extra.lastVisit ?? null,
  };
}

const items = [
  work(1, 'Hộ Nguyễn Văn An'),
  work(2, 'Hộ Trần Thị Bình', { status: 'PAID' }),
  work(3, 'Hộ Lê Văn Cường', { lastVisit: { id: 9, chargeId: 3, result: 'ABSENT', visitedAt: '2026-10-10T02:00:00Z', revisitDate: null, note: null } }),
  work(4, 'Hộ Phạm Thị Dung', { paid: 30_000 }),
];

const paymentResult = (chargeId: number, amount: number) => ({
  payment: { id: 100 + chargeId, code: `TT-1026-00010${chargeId}`, amount, method: 'CASH', paidAt: '2026-10-12T02:00:00Z',
    collectorId: 21, note: null },
  chargeCode: `KT-${chargeId}`, chargeStatus: 'PAID', paidAmount: amount, remainingAmount: 0, replayed: false,
});

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-thu07');
});
afterEach(() => vi.unstubAllGlobals());

function api(overrides: Record<string, (url: string, init: RequestInit) => Response | Promise<Response>> = {}) {
  return mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, collector),
    'GET /api/masterdata/periods': () => jsonResponse(200, periods),
    'GET /api/collection/my-work': () => jsonResponse(200, items),
    'GET /api/collection/cash/held': () =>
      jsonResponse(200, [{ collectorId: 21, collectorUsername: 'thu07', collectorName: 'Nguyễn Thành Mẫu', collectedCash: 240_000,
        handedOver: 80_000, held: 160_000 }]),
    'POST /api/collection/payments': (_url, init) => {
      const body = JSON.parse(String(init.body)) as { chargeId: number; amount: number };
      return jsonResponse(201, paymentResult(body.chargeId, body.amount));
    },
    'POST /api/collection/visits': (_url, init) => {
      const body = JSON.parse(String(init.body)) as { chargeId: number; result: string; revisitDate?: string };
      return jsonResponse(201, { id: 50, chargeId: body.chargeId, result: body.result, visitedAt: '2026-10-12T02:00:00Z',
        revisitDate: body.revisitDate ?? null, note: null });
    },
    ...overrides,
  });
}

function posts(fetchFn: ReturnType<typeof mockApi>, path: string) {
  return fetchFn.mock.calls
    .filter(([url, init]) => String(url) === path && (init as RequestInit | undefined)?.method === 'POST')
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>);
}

const norm = { normalizer: (s: string) => s.replace(/\s+/g, ' ').trim() };

async function openSheet(name: string) {
  const row = await screen.findByRole('listitem', { name });
  await userEvent.click(within(row).getByRole('button', { name: 'Cập nhật' }));
  return screen.findByRole('dialog');
}

describe('Người đi thu: danh sách thu', () => {
  it('hiện trạng thái từng hộ, tiền mặt đang giữ; lọc và tìm không dấu', async () => {
    api();
    renderApp('/collector/list');

    expect(await screen.findByText('Hộ Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('1/4 hộ')).toBeInTheDocument();
    expect(await screen.findByText('160.000 đ', norm)).toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Hộ Lê Văn Cường' })).getByText('Vắng nhà')).toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Hộ Trần Thị Bình' })).queryByRole('button')).not.toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Hộ Phạm Thị Dung' })).getByText('50.000 đ', norm)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Vắng'));
    expect(screen.queryByText('Hộ Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.getByText('Hộ Lê Văn Cường')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Tất cả'));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm hộ' }), 'tran thi')
    expect(screen.getByText('Hộ Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Hộ Nguyễn Văn An')).not.toBeInTheDocument();
  });

  it('thu tiền mặt: mặc định số còn thiếu; bấm Xác nhận hai lần nhanh chỉ dùng một requestId', async () => {
    const fetchFn = api();
    renderApp('/collector/list');

    const dialog = await openSheet('Hộ Phạm Thị Dung');
    expect(within(dialog).getByLabelText('Số tiền thu')).toHaveValue('50.000');
    const confirm = within(dialog).getByRole('button', { name: 'Xác nhận' });
    await userEvent.dblClick(confirm);

    await waitFor(() => expect(posts(fetchFn, '/api/collection/payments').length).toBeGreaterThan(0));
    const sent = posts(fetchFn, '/api/collection/payments');
    expect(new Set(sent.map((b) => b.clientRequestId)).size).toBe(1);
    expect(sent[0]).toMatchObject({ chargeId: 4, amount: 50_000, method: 'CASH' });
    expect(await screen.findByText('Đã thu 50.000 đ · Hộ Phạm Thị Dung', norm)).toBeInTheDocument();
  });

  it('mạng lỗi thì gửi lại dùng requestId cũ; thu xong hộ khác thì requestId mới', async () => {
    let fail = true;
    const fetchFn = api({
      'POST /api/collection/payments': (_url, init) => {
        if (fail) {
          fail = false;
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        const body = JSON.parse(String(init.body)) as { chargeId: number; amount: number };
        return jsonResponse(201, paymentResult(body.chargeId, body.amount));
      },
    });
    renderApp('/collector/list');

    let dialog = await openSheet('Hộ Nguyễn Văn An');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(posts(fetchFn, '/api/collection/payments')).toHaveLength(2));
    const [first, retry] = posts(fetchFn, '/api/collection/payments');
    expect(retry!.clientRequestId).toBe(first!.clientRequestId);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    dialog = await openSheet('Hộ Phạm Thị Dung');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(posts(fetchFn, '/api/collection/payments')).toHaveLength(3));
    expect(posts(fetchFn, '/api/collection/payments')[2]!.clientRequestId).not.toBe(first!.clientRequestId);
  });

  it('số tiền vượt số còn thiếu bị chặn; chọn "Hẹn lại" thì bắt buộc ngày hẹn', async () => {
    const fetchFn = api();
    renderApp('/collector/list');

    const dialog = await openSheet('Hộ Phạm Thị Dung');
    const amount = within(dialog).getByLabelText('Số tiền thu');
    await userEvent.clear(amount);
    await userEvent.type(amount, '60000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    expect(await within(dialog).findByText('Không vượt số còn thiếu (50.000 đ)', norm)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByText('Hẹn lại'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    expect(await within(dialog).findByText('Vui lòng chọn ngày hẹn')).toBeInTheDocument();
    expect(posts(fetchFn, '/api/collection/visits')).toHaveLength(0);

    const day = dayjs().add(3, 'day');
    pickDate(within(dialog).getByLabelText('Ngày hẹn'), day.format('DD/MM/YYYY'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() =>
      expect(posts(fetchFn, '/api/collection/visits')[0]).toMatchObject({
        chargeId: 4, result: 'APPOINTMENT', revisitDate: day.format('YYYY-MM-DD'),
      }),
    );
    expect(posts(fetchFn, '/api/collection/payments')).toHaveLength(0);
  });
});

describe('Người đi thu: tiền mặt', () => {
  it('hiện đang giữ và lịch sử bàn giao', async () => {
    api({
      'GET /api/collection/cash/handovers': () =>
        jsonResponse(200, [{ id: 1, code: 'BG-1026-01', collectorId: 21, collectorName: 'Nguyễn Thành Mẫu',
          handoverDate: '2026-10-11', amount: 80_000, note: null }]),
    });
    renderApp('/collector/cash');

    expect(await screen.findByText('BG-1026-01')).toBeInTheDocument();
    expect(screen.getByText('11/10/2026')).toBeInTheDocument();
    expect(await screen.findByText('160.000 đ', norm)).toBeInTheDocument();
  });
});
