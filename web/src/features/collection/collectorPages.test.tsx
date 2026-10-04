import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    lastPaidAt: paid > 0 ? (id === 2 ? '2026-10-12T03:00:00Z' : '2026-10-14T03:00:00Z') : null,
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
    'GET /api/collection/charges/4/transfer-info': () =>
      jsonResponse(200, { configured: true, bankName: 'Vietcombank', bankAccount: '0071000888888',
        accountHolder: 'Công ty MTĐT Đông Thạnh', amount: 50_000, code: 'VSMT000004' }),
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

async function openSheet(name: string, method = 'Đã thu tiền mặt') {
  const row = await screen.findByRole('listitem', { name });
  await userEvent.click(within(row).getByRole('button', { name: method }));
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
    expect(within(screen.getByRole('listitem', { name: 'Hộ Trần Thị Bình' })).queryByRole('button', { name: /^(Đã thu tiền mặt|Chuyển khoản \(QR\))$/ }))
      .not.toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Hộ Phạm Thị Dung' })).getByText('50.000 đ', norm)).toBeInTheDocument();

    // BR-COL-04: không có nút lọc vắng / hẹn, chỉ Tất cả / Chưa thu / Quá hạn / Đã thu.
    expect(screen.queryByRole('button', { name: /^Vắng nhà/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đã thu 1' }));
    expect(screen.queryByText('Hộ Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.getByText('Hộ Trần Thị Bình')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tất cả 4' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm hộ' }), 'tran thi')
    expect(screen.getByText('Hộ Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Hộ Nguyễn Văn An')).not.toBeInTheDocument();
  });

  it('nhật ký ngày giờ đi thu trên thẻ; lọc theo ngày đã thu', async () => {
    api();
    renderApp('/collector/list');

    const binh = await screen.findByRole('listitem', { name: 'Hộ Trần Thị Bình' });
    expect(within(binh).getByText('Đã thu lúc 12/10/2026 10:00')).toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Hộ Lê Văn Cường' })).getByText('Vắng nhà lúc 10/10/2026 09:00')).toBeInTheDocument();

    pickDate(screen.getByLabelText('Ngày đã thu'), '12/10/2026');
    await waitFor(() => expect(screen.queryByText('Hộ Nguyễn Văn An')).not.toBeInTheDocument());
    expect(screen.getByText('Hộ Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Hộ Phạm Thị Dung')).not.toBeInTheDocument();
  });

  it('thu tiền mặt: thu đủ số còn thiếu; bấm Xác nhận hai lần nhanh chỉ dùng một requestId', async () => {
    const fetchFn = api();
    renderApp('/collector/list');

    const dialog = await openSheet('Hộ Phạm Thị Dung');
    const confirm = within(dialog).getByRole('button', { name: /^Xác nhận đã thu/ });
    await userEvent.dblClick(confirm);

    await waitFor(() => expect(posts(fetchFn, '/api/collection/payments').length).toBeGreaterThan(0));
    const sent = posts(fetchFn, '/api/collection/payments');
    expect(new Set(sent.map((b) => b.clientRequestId)).size).toBe(1);
    expect(sent[0]).toMatchObject({ chargeId: 4, amount: 50_000, method: 'CASH' });
    expect(await screen.findByText('Đã thu 50.000 đ · Hộ Phạm Thị Dung', norm)).toBeInTheDocument();
  });

  it('trình duyệt không có crypto.randomUUID (điện thoại mở qua http://<IP LAN>) vẫn ghi nhận được', async () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) });
    const fetchFn = api();
    renderApp('/collector/list');

    const dialog = await openSheet('Hộ Nguyễn Văn An');
    await userEvent.click(within(dialog).getByRole('button', { name: /^Xác nhận đã thu/ }));
    await waitFor(() => expect(posts(fetchFn, '/api/collection/payments')).toHaveLength(1));
    expect(posts(fetchFn, '/api/collection/payments')[0]!.clientRequestId).toMatch(/^[0-9a-f]{32}$/);
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
    await userEvent.click(within(dialog).getByRole('button', { name: /^Xác nhận đã thu/ }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ');
    await userEvent.click(within(dialog).getByRole('button', { name: /^Xác nhận đã thu/ }));
    await waitFor(() => expect(posts(fetchFn, '/api/collection/payments')).toHaveLength(2));
    const [first, retry] = posts(fetchFn, '/api/collection/payments');
    expect(retry!.clientRequestId).toBe(first!.clientRequestId);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    dialog = await openSheet('Hộ Phạm Thị Dung');
    await userEvent.click(within(dialog).getByRole('button', { name: /^Xác nhận đã thu/ }));
    await waitFor(() => expect(posts(fetchFn, '/api/collection/payments')).toHaveLength(3));
    expect(posts(fetchFn, '/api/collection/payments')[2]!.clientRequestId).not.toBe(first!.clientRequestId);
  });

  it('chuyển khoản hiện QR đúng số tiền, không có nút tự xác nhận; nút mô phỏng (demo) gửi method TRANSFER', async () => {
    const fetchFn = api();
    renderApp('/collector/list');

    const dialog = await openSheet('Hộ Phạm Thị Dung', 'Chuyển khoản (QR)');
    expect(within(dialog).queryByText('Đã hẹn')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Vắng nhà')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Số tiền thực thu')).not.toBeInTheDocument();
    expect(await within(dialog).findByText('Nội dung: VSMT000004')).toBeInTheDocument();
    expect(within(dialog).getByText('Vietcombank · 0071000888888')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'Mã QR chuyển khoản' })).toHaveAttribute(
      'src', 'https://qr.sepay.vn/img?acc=0071000888888&bank=Vietcombank&amount=50000&des=VSMT000004');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Đang chờ hộ chuyển khoản');
    expect(within(dialog).queryByRole('button', { name: /^Xác nhận đã thu/ })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Mô phỏng hộ đã chuyển khoản' }));
    await waitFor(() =>
      expect(posts(fetchFn, '/api/collection/payments')[0]).toMatchObject({
        chargeId: 4, amount: 50_000, method: 'TRANSFER',
      }),
    );
    expect(posts(fetchFn, '/api/collection/visits')).toHaveLength(0);
  });

  it('hộ thanh toán xong thì màn QR tự xác nhận và đóng, người đi thu không bấm gì', async () => {
    let paid = false;
    const fetchFn = api({
      'GET /api/collection/my-work': () =>
        jsonResponse(200, paid ? items.map((w) => (w.charge.id === 4 ? work(4, 'Hộ Phạm Thị Dung', { status: 'PAID' }) : w)) : items),
    });
    renderApp('/collector/list');

    await openSheet('Hộ Phạm Thị Dung', 'Chuyển khoản (QR)');
    paid = true;

    expect(await screen.findByText(/Hộ đã chuyển khoản thành công/, undefined, { timeout: 10_000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(posts(fetchFn, '/api/collection/payments')).toHaveLength(0);
  });
});

describe('Người đi thu: lịch sử hộ', () => {
  it('mở từ danh sách, hiện lượt ghé và lần thu theo thời gian', async () => {
    api({
      'GET /api/collection/charges/4/history': () =>
        jsonResponse(200, [
          { at: '2026-10-10T02:00:00Z', payment: null,
            visit: { id: 9, chargeId: 4, result: 'APPOINTMENT', visitedAt: '2026-10-10T02:00:00Z', revisitDate: '2026-10-12',
              note: 'Chủ nhà đi vắng' } },
          { at: '2026-10-12T03:30:00Z', visit: null,
            payment: { id: 7, code: 'TT-1026-000007', amount: 30_000, method: 'CASH', paidAt: '2026-10-12T03:30:00Z',
              collectorId: 21, note: null } },
        ]),
    });
    renderApp('/collector/list');

    const row = await screen.findByRole('listitem', { name: 'Hộ Phạm Thị Dung' });
    await userEvent.click(within(row).getByRole('button', { name: 'Lịch sử' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Đã thu 30.000 đ', norm)).toBeInTheDocument();
    const items = within(dialog).getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('Hẹn lại');
    expect(items[0]).toContain('Ngày hẹn 12/10/2026');
    expect(items[1]).toContain('TT-1026-000007');
  });
});

describe('Người đi thu: báo sai thông tin hộ', () => {
  it('mở từ đúng hàng và gửi khoản của hộ đó', async () => {
    const fetchFn = api({ 'POST /api/collection/subject-reports': () => new Response(null, { status: 204 }) });
    renderApp('/collector/list');

    const row = await screen.findByRole('listitem', { name: 'Hộ Phạm Thị Dung' });
    await userEvent.click(within(row).getByRole('button', { name: 'Báo sai thông tin' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByText('Sai thông tin hộ (tên, địa chỉ, SĐT)'));
    await userEvent.type(within(dialog).getByLabelText('Ghi chú'), 'Sai số nhà');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo cáo' }));

    await waitFor(() =>
      expect(posts(fetchFn, '/api/collection/subject-reports')).toEqual([
        { chargeId: 4, reportType: 'WRONG_INFO', description: 'Sai số nhà' },
      ]),
    );
  });
});

describe('Người đi thu: các kỳ trước', () => {
  it('thẻ hộ đánh dấu kỳ trước đã nộp / còn nợ (lấy từ danh sách mọi kỳ)', async () => {
    const old = (periodCode: string, status: string, id: number) => {
      const w = work(1, 'Hộ Nguyễn Văn An', { status });
      return { ...w, charge: { ...w.charge, id, periodId: id, periodCode } };
    };
    api({
      'GET /api/collection/my-work': (url) =>
        jsonResponse(200, url.includes('periodId') ? items : [...items, old('2026-09', 'PAID', 91), old('2026-08', 'UNPAID', 92)]),
    });
    renderApp('/collector/list');

    const card = await screen.findByRole('listitem', { name: 'Hộ Nguyễn Văn An' });
    expect(await within(card).findByText('09/2026', { exact: false })).toBeInTheDocument();
    expect(within(card).getByText((_, el) => el?.classList.contains('debt') === true && el.textContent?.includes('08/2026') === true))
      .toHaveTextContent('còn 80.000 đ');
    expect(within(screen.getByRole('listitem', { name: 'Hộ Trần Thị Bình' })).queryByText('Các kỳ trước')).not.toBeInTheDocument();
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
