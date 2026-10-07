import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const periods = [
  { id: 10, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', settlementDueDate: '2026-11-05', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
    lockedAt: null, note: null },
  { id: 8, code: '2026-08', periodType: 'MONTH', label: 'Tháng 08/2026', startDate: '2026-08-01', endDate: '2026-08-31',
    openDate: '2026-08-01', dueDate: '2026-08-31', settlementDueDate: '2026-09-05', tariffVersionId: 2, tariffVersionCode: 'BG-67-2025', status: 'LOCKED',
    lockedAt: '2026-09-05T03:00:00Z', note: null },
];
const dv01 = {
  companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 10, due: 1_600_000, chargeCount: 20,
  collected: 1_200_000, cashCollected: 1_200_000, received: 0, settlementId: null, settlementCode: null, remaining: 600_000, gap: -200_000, previousDebt: 0,
  overdue: false, collectionRate: 75, lowCollectionRate: false, remittedRate: 62.5, lowRemittedRate: false, progress: 'NOT_PAID',
  reconciliation: 'PENDING', adjustment: 0, refunded: 0, retained: 0, payable: 1_600_000, debtCollected: 0, communePaid: 0, communeOwed: 0, lastPeriodDebt: 0,
};
const dv07 = { ...dv01, companyId: 7, companyCode: 'DV07', companyName: 'Công ty Xanh Sài Gòn', due: 800_000, collected: 200_000,
  received: 0, remaining: 800_000, gap: -200_000, previousDebt: 150_000, collectionRate: 25,
  lowCollectionRate: true, remittedRate: 0, lowRemittedRate: true, progress: 'OVERDUE', reconciliation: 'MISMATCH' };
const areas = [
  { areaId: 7, areaCode: 'KV07', areaName: 'Tổ dân phố 07', districtCode: 'DTH', companyId: 1, companyCode: 'DV01', due: 800_000,
    collected: 640_000, chargeCount: 10, paidCount: 8, subjectCount: 10, collectionRate: 80, lowCollectionRate: false, noCompany: false,
    debtHouseholds: 2 },
  { areaId: 24, areaCode: 'KV24', areaName: 'Tổ dân phố 24', districtCode: 'NB', companyId: null, companyCode: null, due: 0,
    collected: 0, chargeCount: 0, paidCount: 0, subjectCount: 9, collectionRate: 0, lowCollectionRate: false, noCompany: true,
    debtHouseholds: 0 },
];
const debtPage = {
  items: [
    { chargeId: 91, subjectCode: 'DTH-H000128', subjectName: 'Nguyễn Văn Mẫu', subjectAddress: 'Số 1', areaId: 7, areaCode: 'KV07',
      areaName: 'Tổ dân phố 07', companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 8,
      periodLabel: 'Tháng 08/2026', amount: 80_000, debtPeriods: 2 },
  ],
  total: 3, page: 0, size: 10, householdCount: 2, totalAmount: 240_000,
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
});
afterEach(() => vi.unstubAllGlobals());

function api() {
  return mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, officer),
    'GET /api/masterdata/periods': () => jsonResponse(200, periods),
    'GET /api/remittance/ledger': () => jsonResponse(200, [dv01, dv07]),
    'GET /api/remittance/area-progress': () => jsonResponse(200, areas),
    'GET /api/remittance/household-debts': () => jsonResponse(200, debtPage),
    'GET /api/billing/charges': (url) =>
      jsonResponse(200, url.includes('areaId=7&')
        ? { items: [{ id: 1, code: 'KT-1026-DTH-H000128', subjectCode: 'DTH-H000128', subjectName: 'Nguyễn Văn Mẫu', subjectAddress: 'Số 1',
            amount: 80_000, status: 'UNPAID', overdue: true, memberCount: 4, tariffGroup: 'HH_3_PLUS' }], total: 1, page: 0, size: 500 }
        : { items: [], total: 0, page: 0, size: 500 }),
  });
}

const norm = { normalizer: (s: string) => s.replace(/\s+/g, ' ').trim() };

describe('Tiến độ thu', () => {
  it('bảng công ty chỉ số liệu thu (bỏ cột nộp xã), khoản đã thu cộng từ các tổ, thẻ quá hạn nộp cạnh tên; cảnh báo kỳ trước, tổ chưa có công ty', async () => {
    const fetchFn = api();
    renderApp('/commune/progress');

    const dv01Row = (await screen.findByText('Công ty MTĐT Đông Thạnh')).closest('tr')!;
    await waitFor(() => expect(within(dv01Row).getByText('8/10')).toBeInTheDocument());
    expect(within(dv01Row).getByText('75%')).toBeInTheDocument();
    expect(within(dv01Row).queryByText('Quá hạn quyết toán')).not.toBeInTheDocument();
    // DV07 quá hạn quyết toán (khớp nút nhắc nộp); không có tổ nên khoản đã thu là dấu gạch.
    const dv07Row = screen.getByText('Công ty Xanh Sài Gòn').closest('tr')!;
    expect(within(dv07Row).getByText('Quá hạn quyết toán')).toBeInTheDocument();
    expect(within(dv07Row).getByText('—')).toBeInTheDocument();
    expect(screen.getByText('1 tổ chưa có công ty thu: KV24')).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(expect.arrayContaining(['Công ty', 'Phải thu', 'Đã thu', 'Công nợ tháng trước', 'Tỷ lệ thu', 'Khoản đã thu']));
    for (const removed of ['Tỷ lệ nộp', 'Đã nộp đủ']) expect(headers).not.toContain(removed);
    // Công nợ tháng trước nằm ngay sau Đã thu.
    expect(headers.indexOf('Công nợ tháng trước')).toBe(headers.indexOf('Đã thu') + 1);
    for (const removed of ['Phải nộp xã', 'Đã nộp', 'Còn phải nộp']) expect(headers).not.toContain(removed);
    expect(screen.queryByRole('columnheader', { name: 'Nợ kỳ trước' })).not.toBeInTheDocument();
    // Cảnh báo đầu trang thay cho cột: chỉ DV07 có previousDebt.
    expect(screen.getByText(/Kỳ trước chưa khóa: Công ty Xanh Sài Gòn còn phải nộp/)).toHaveTextContent('150.000 đ');
    expect(screen.getAllByText(/Kỳ trước chưa khóa/)).toHaveLength(1);
    await waitFor(() =>
      expect(fetchFn.mock.calls.some(([url]) => String(url) === '/api/remittance/ledger?periodId=10')).toBe(true),
    );

    // Bấm "+" ở công ty thấy tổ; bấm "+" ở tổ mới tải và hiện hộ chưa thu kèm số nhân khẩu, nhóm giá.
    await userEvent.click(screen.getAllByRole('button', { name: /mở rộng|expand/i })[0]!);
    const area = (await screen.findByText('KV07 · Tổ dân phố 07')).closest('tr')!;
    expect(within(area).getByText('8/10')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Hộ còn nợ tháng trước' })).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([url]) => String(url).startsWith('/api/billing/charges'))).toBe(false);
    await userEvent.click(within(area).getByRole('button', { name: /mở rộng|expand/i }));
    const household = (await screen.findByText('DTH-H000128 · Nguyễn Văn Mẫu')).closest('tr')!;
    expect(within(household).getByText('4')).toBeInTheDocument();
    expect(within(household).getByText('HGĐ ≥ 3 người')).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([url]) => String(url).startsWith('/api/billing/charges?periodId=10&areaId=7&companyId=1&status=UNPAID'))).toBe(true);
  });

  it('tỷ lệ thu = đã thu của kỳ / phải thu, thanh trơn không tô đỏ dưới 45%; phải thu bằng 0 thì hiện dấu gạch', async () => {
    // (300.000 − 100.000 thu nợ kỳ cũ) / 800.000 = 25% (dưới 45%) nhưng không có cờ đỏ; DV04 không có gì phải thu.
    const dv03 = { ...dv01, companyId: 3, companyCode: 'DV03', companyName: 'Công ty Ba', due: 800_000, collected: 300_000,
      debtCollected: 100_000, collectionRate: 37.5, lowCollectionRate: true };
    const dv04 = { ...dv01, companyId: 4, companyCode: 'DV04', companyName: 'Công ty Bốn', due: 0, collected: 0, cashCollected: 0,
      payable: 0, received: 0, remaining: 0, gap: 0, collectionRate: 0, remittedRate: 0, lowRemittedRate: false,
      progress: 'PAID_IN_FULL', reconciliation: 'MATCHED' };
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/ledger': () => jsonResponse(200, [dv03, dv04]),
      'GET /api/remittance/area-progress': () => jsonResponse(200, [
        { ...areas[0]!, companyId: 3, collectionRate: 30, lowCollectionRate: true },
      ]),
    });
    const { container } = renderApp('/commune/progress');

    const row = (await screen.findByText('Công ty Ba')).closest('tr')!;
    expect(within(row).getByText('25%')).toBeInTheDocument();
    const zero = (await screen.findByText('Công ty Bốn')).closest('tr')!;
    expect(within(zero).queryByText(/%/)).not.toBeInTheDocument();
    expect(within(zero).getAllByText('—')).toHaveLength(2);
    // Tổ cũng không còn thanh tiến độ đỏ khi tỷ lệ thu dưới 45%.
    await userEvent.click(within(row).getByRole('button', { name: /mở rộng|expand/i }));
    expect(await screen.findByText('KV07 · Tổ dân phố 07')).toBeInTheDocument();
    expect(container.querySelector('.ant-progress-status-exception')).toBeNull();
  });

  it('thẻ tổng có đã thu kèm thu công nợ kỳ cũ, tỷ lệ đã thu và thẻ công nợ hộ; bấm mở danh sách hộ nợ', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/ledger': () => jsonResponse(200, [{ ...dv01, debtCollected: 160_000 }]),
      'GET /api/remittance/area-progress': () => jsonResponse(200, areas),
      'GET /api/remittance/household-debts': () => jsonResponse(200, debtPage),
    });
    renderApp('/commune/progress');

    const debtCard = (await screen.findByText('Công nợ tháng trước', { selector: '.stat-label' })).closest('.stat-card') as HTMLElement;
    expect(await within(debtCard).findByText('2 hộ')).toBeInTheDocument();
    expect(debtCard).toHaveTextContent('240.000 đ');
    const collectedCard = screen.getByText('Đã thu (tiền mặt, chuyển khoản)').closest('.stat-card') as HTMLElement;
    // Đã thu chỉ phần của kỳ (1.200.000 − 160.000), nợ kỳ cũ ở dòng phụ.
    await waitFor(() => expect(collectedCard).toHaveTextContent('thu thêm công nợ kỳ cũ: 160.000 đ'));
    expect(collectedCard).toHaveTextContent('1.040.000 đ');
    // Tỷ lệ đã thu = (1.200.000 − 160.000 thu nợ kỳ cũ) / 1.600.000 = 65%.
    const rateCard = screen.getByText('Tỷ lệ đã thu').closest('.stat-card') as HTMLElement;
    expect(rateCard).toHaveTextContent('65%');
    for (const label of ['Phải nộp xã', 'Đã nộp', 'Còn phải nộp', 'Xã trả lại công ty']) {
      expect(screen.queryByText(label, { selector: '.stat-label' })).not.toBeInTheDocument();
    }
    expect(screen.queryByText('Nợ kỳ trước')).not.toBeInTheDocument();

    await userEvent.click(within(debtCard).getByRole('button', { name: 'Xem danh sách' }));
    const dialog = await screen.findByRole('dialog');
    const row = (await within(dialog).findByText('DTH-H000128 · Nguyễn Văn Mẫu')).closest('tr')!;
    expect(within(row).getByText('Tháng 08/2026')).toBeInTheDocument();
    expect(within(row).getByText('KV07 · Tổ dân phố 07')).toBeInTheDocument();
    expect(within(row).getByText('80.000 đ', norm)).toBeInTheDocument();
    expect(within(dialog).getByText('2 hộ, 3 khoản chưa thu của kỳ trước')).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([url]) => String(url) === '/api/remittance/household-debts?previousOf=10&page=0&size=10')).toBe(true);
  });

  it('cột Hộ còn nợ tháng trước của tổ mở danh sách lọc theo tổ và công ty, chỉ nợ kỳ liền trước', async () => {
    const fetchFn = api();
    renderApp('/commune/progress');

    await userEvent.click((await screen.findAllByRole('button', { name: /mở rộng|expand/i }))[0]!);
    await userEvent.click(await screen.findByRole('button', { name: 'Xem 2 hộ còn nợ tháng trước của KV07' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchFn.mock.calls.some(([url]) => String(url) === '/api/remittance/household-debts?previousOf=10&companyId=1&areaId=7&page=0&size=10')).toBe(true),
    );
  });

  it('lãnh đạo xem được thẻ công nợ tháng trước nhưng không có nút nhắc nộp', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, { ...officer, id: 9, username: 'lanhdao', role: 'LEADER' }),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/ledger': () => jsonResponse(200, [dv01, dv07]),
      'GET /api/remittance/area-progress': () => jsonResponse(200, areas),
      'GET /api/remittance/household-debts': () => jsonResponse(200, debtPage),
    });
    renderApp('/leader/progress');

    expect(await screen.findByText('2 hộ')).toBeInTheDocument();
    expect(await screen.findByText('Công ty Xanh Sài Gòn')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nhắc công ty nộp/ })).not.toBeInTheDocument();
  });
});

describe('Đối soát', () => {
  // Mỗi khoản 60.000 = vận chuyển 20.000 + thu gom 40.000 (SPEC đối soát). A: 620 tiền mặt, 260 QR, chưa nộp.
  const split = { adjustment: 0, refunded: 0, previousDebt: 0, communePaid: 0, communeOwed: 0, retained: 35_200_000,
    qrTotal: 15_600_000, qrTransport: 5_200_000, qrCollection: 10_400_000, cashCollected: 37_200_000, cashTransport: 12_400_000,
    cashCollection: 24_800_000, collected: 52_800_000, payable: 2_000_000, received: 0, remaining: 2_000_000,
    holding: 15_600_000, entitled: 17_600_000, settled: false, qrProcessing: 0, cashProcessing: 0 };
  const cty1 = { ...dv01, ...split, companyName: 'Cty Thu gom A' };
  // B đã quyết toán: xem được phiếu.
  const cty2 = { ...cty1, companyId: 2, companyCode: 'DV02', companyName: 'Cty Thu gom B', received: 2_000_000, remaining: 0,
    holding: 17_600_000, settled: true, settlementId: 50, settlementCode: 'QT-1026-002' };
  const settlement = { id: 50, code: 'QT-1026-002', companyId: 2, companyCode: 'DV02', companyName: 'Cty Thu gom B', periodId: 10,
    periodCode: '2026-10', periodLabel: 'Tháng 10/2026', companyOwes: 12_400_000, communeOwes: 10_400_000, amount: 2_000_000,
    amountInWords: 'Hai triệu đồng', method: 'TRANSFER', settleDate: '2026-11-02', representativeName: 'Trần Văn Mẫu', documentRef: null, note: null };
  // Hạn dân đóng tính theo hôm nay: đã qua thì lập được phiếu, chưa qua thì nút bị khóa.
  const withDue = (dueDate: string) => periods.map((p) => (p.id === 10 ? { ...p, dueDate } : p));
  const passed = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  // C: 305 tiền mặt, 435 QR: xã phải trả công ty 11.300.000.
  const cty3 = { ...cty1, companyId: 3, companyCode: 'DV03', companyName: 'Cty Thu gom C', qrTotal: 26_100_000, qrTransport: 8_700_000,
    qrCollection: 17_400_000, cashCollected: 18_300_000, cashTransport: 6_100_000, cashCollection: 12_200_000, payable: -11_300_000,
    remaining: -11_300_000, communeOwed: 11_300_000, holding: 26_100_000, entitled: 14_800_000 };

  function setup(dueDate = passed) {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, withDue(dueDate)),
      'GET /api/remittance/ledger': () => jsonResponse(200, [cty1, cty2, cty3]),
      'GET /api/remittance/unidentified-qr': () => jsonResponse(200, { count: 3, amount: 180_000 }),
      'GET /api/remittance/settlements': () => jsonResponse(200, [settlement]),
      'POST /api/remittance/settlements': () =>
        jsonResponse(201, { ...settlement, id: 51, code: 'QT-1026-003', companyId: 1, companyCode: 'DV01', companyName: 'Cty Thu gom A' }),
    });
    renderApp('/commune/reconciliation');
    return fetchFn;
  }

  it('tổng kỳ: xã đang giữ − được hưởng = thừa; cảnh báo QR chưa xác định', async () => {
    setup();

    // Giữ 59.300.000 − hưởng 50.000.000 = thừa 9.300.000.
    expect(await screen.findByText('Xã đang THỪA')).toBeInTheDocument();
    const text = () => document.body.textContent!.replace(/\s+/g, ' ');
    await waitFor(() => expect(text()).toContain('9.300.000'));
    expect(text()).not.toContain('Xã còn phải chi');
    // Sao kê QR = QR của các công ty (57.300.000) + chưa xác định (180.000).
    expect(await screen.findByText(/Sao kê QR/)).toHaveTextContent('57.480.000');
    expect(screen.getByText(/3 giao dịch chưa xác định Cty/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xử lý/ })).toHaveAttribute('href', '/commune/transfers');
  });

  it('bảng 11 cột theo nhóm QR / tiền mặt / đối chiếu; nút phiếu quyết toán; tab lọc Chưa / Đã quyết toán', async () => {
    setup();

    expect(await screen.findByText('Xã nhận qua QR')).toBeInTheDocument();
    expect(screen.getByText('Cty thu tiền mặt')).toBeInTheDocument();
    expect(screen.getByText('Đối chiếu tiền xã')).toBeInTheDocument();
    await screen.findByRole('cell', { name: 'Cty Thu gom A' });
    const rowOf = (name: string) => screen.getByRole('cell', { name }).closest('tr')!;
    const a = rowOf('Cty Thu gom A');
    expect(within(a).getByText('Cty nộp Xã 2.000.000 đ', norm)).toBeInTheDocument();
    expect(within(a).getByRole('button', { name: 'Lập phiếu quyết toán DV01' })).toBeEnabled();
    const b = rowOf('Cty Thu gom B');
    expect(within(b).getByText('Đã quyết toán')).toBeInTheDocument();
    expect(await within(b).findByRole('button', { name: 'Xem phiếu DV02' })).toHaveTextContent('QT-1026-002');
    const c = rowOf('Cty Thu gom C');
    // Xã phải trả công ty hiện số âm ở cột Kết quả.
    expect(within(c).getByText('−11.300.000 đ', norm)).toBeInTheDocument();
    expect(within(c).getByRole('button', { name: 'Lập phiếu quyết toán DV03' })).toBeInTheDocument();

    await userEvent.click(screen.getByText('Đã quyết toán 1'));
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'Cty Thu gom A' })).not.toBeInTheDocument());
    expect(screen.getByRole('cell', { name: 'Cty Thu gom B' })).toBeInTheDocument();
    await userEvent.click(screen.getByText('Chưa quyết toán 2'));
    expect(await screen.findByRole('cell', { name: 'Cty Thu gom A' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Cty Thu gom B' })).not.toBeInTheDocument();
  });

  it('nhóm QR / tiền mặt mặc định chỉ cột Tổng; bấm Chi tiết tách Vận chuyển, Thu gom, Xử lý', async () => {
    setup();

    await screen.findByRole('cell', { name: 'Cty Thu gom A' });
    expect(screen.queryByRole('columnheader', { name: 'Xử lý' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xem chi tiết Xã nhận qua QR' }));
    expect(screen.getAllByRole('columnheader', { name: 'Xử lý' })).toHaveLength(1);
    expect(screen.getAllByRole('columnheader', { name: 'Vận chuyển' })).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Xem chi tiết Cty thu tiền mặt' }));
    expect(screen.getAllByRole('columnheader', { name: 'Xử lý' })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn Xã nhận qua QR' }));
    expect(screen.getAllByRole('columnheader', { name: 'Xử lý' })).toHaveLength(1);
  });

  it('chưa qua hạn dân đóng thì nút Lập phiếu quyết toán bị khóa; tiêu đề hiện hai hạn', async () => {
    const due = dayjs().add(3, 'day');
    setup(due.format('YYYY-MM-DD'));

    const button = await screen.findByRole('button', { name: 'Lập phiếu quyết toán DV01' });
    expect(button).toBeDisabled();
    expect(screen.getByText(new RegExp(`Hạn dân đóng ${due.format('DD/MM/YYYY')} · Hạn quyết toán 05/11/2026`))).toBeInTheDocument();
  });

  it('sau hạn dân đóng: lập phiếu quyết toán, gửi máy chủ rồi hiện bản in', async () => {
    const fetchFn = setup();

    await userEvent.click(await screen.findByRole('button', { name: 'Lập phiếu quyết toán DV01' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Xã phải trả công ty')).toBeInTheDocument();
    expect(within(dialog).getByText('12.400.000 đ', norm)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lập phiếu' }));

    await waitFor(() => {
      const post = fetchFn.mock.calls.find(([url, init]) => String(url) === '/api/remittance/settlements'
        && (init as RequestInit | undefined)?.method === 'POST');
      expect(JSON.parse(String((post![1] as RequestInit).body))).toMatchObject({ companyId: 1, periodId: 10, method: 'TRANSFER' });
    });
    expect(await screen.findByText('PHIẾU QUYẾT TOÁN')).toBeInTheDocument();
    expect(screen.getByText('Hai triệu đồng')).toBeInTheDocument();
  });
});

describe('Khóa kỳ', () => {
  it('còn công ty chưa quyết toán thì hiện lý do tiếng Việt từ máy chủ', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/ledger': () => jsonResponse(200, [dv01, dv07]),
      'POST /api/remittance/periods/10/lock': () =>
        jsonResponse(422, {
          code: 'PERIOD_NOT_SETTLED',
          message: 'Chưa khóa được kỳ 2026-10 vì còn 2 công ty chưa quyết toán: DV01, DV07.',
        }),
    });
    renderApp('/commune/reconciliation');

    await userEvent.click(await screen.findByRole('button', { name: /Khóa kỳ/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Khóa kỳ' }));

    expect(await screen.findByText(/còn 2 công ty chưa quyết toán/)).toHaveTextContent('DV01, DV07');
    expect(fetchFn.mock.calls.some(([url]) => String(url) === '/api/remittance/periods/10/lock')).toBe(true);
  });
});

describe('Nhắc nộp', () => {
  it('nút Nhắc công ty nộp mở popup chọn công ty quá hạn; hiện nợ theo kỳ và gửi nội dung đã sửa', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/ledger': () => jsonResponse(200, [dv01, dv07]),
      'GET /api/remittance/area-progress': () => jsonResponse(200, areas),
      'GET /api/remittance/reminders/draft': () =>
        jsonResponse(200, {
          companyId: 7, companyCode: 'DV07', companyName: 'Công ty Xanh Sài Gòn', amount: 950_000, dueDate: '2026-11-08',
          content: 'Kính gửi Công ty Xanh Sài Gòn', debts: [
            { periodId: 9, periodLabel: 'Tháng 09/2026', periodDueDate: '2026-09-30', remaining: 150_000 },
            { periodId: 10, periodLabel: 'Tháng 10/2026', periodDueDate: '2026-10-31', remaining: 800_000 },
          ],
        }),
      'POST /api/remittance/reminders': () =>
        jsonResponse(201, { id: 1, code: 'NN-001', companyId: 7, companyCode: 'DV07', reminderDate: '2026-11-03',
          dueDate: '2026-11-08', periodLabels: ['Tháng 09/2026', 'Tháng 10/2026'], amount: 950_000, content: 'x', settled: false }),
    });
    renderApp('/commune/progress');

    await userEvent.click(await screen.findByRole('button', { name: /Nhắc công ty nộp \(1\)/ }));
    // Dòng công ty không còn nút nhắc riêng; chỉ một công ty quá hạn nên popup chọn sẵn công ty đó.
    expect(screen.queryByRole('button', { name: /^Nhắc nộp/ })).not.toBeInTheDocument();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('combobox', { name: 'Công ty cần nhắc' })).toBeInTheDocument();
    expect(await within(dialog).findByText('Tháng 09/2026')).toBeInTheDocument();
    expect(within(dialog).getByText('950.000 đ', norm)).toBeInTheDocument();

    const content = within(dialog).getByLabelText('Nội dung');
    await userEvent.clear(content);
    await userEvent.type(content, 'Đề nghị nộp gấp');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi nhắc nộp' }));

    await waitFor(() => {
      const post = fetchFn.mock.calls.find(([url, init]) => String(url) === '/api/remittance/reminders'
        && (init as RequestInit | undefined)?.method === 'POST');
      expect(JSON.parse(String((post![1] as RequestInit).body))).toEqual({ companyId: 7, dueDate: '2026-11-08', content: 'Đề nghị nộp gấp' });
    });
  });
});

describe('Phiếu quyết toán', () => {
  it('danh sách theo kỳ: hai số phải trả, chênh lệch kèm chiều chuyển tiền; bấm In mở bản in', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/settlements': () =>
        jsonResponse(200, [{
          id: 5, code: 'QT-1026-001', companyId: 3, companyCode: 'DV03', companyName: 'Công ty Ba', periodId: 10, periodCode: '2026-10',
          periodLabel: 'Tháng 10/2026', companyOwes: 6_100_000, communeOwes: 17_400_000, amount: -11_300_000,
          amountInWords: 'Mười một triệu ba trăm nghìn đồng', method: 'CASH', settleDate: '2026-11-03', representativeName: 'Lê Thị Mẫu',
          documentRef: null, note: null,
        }]),
    });
    renderApp('/commune/settlements');

    const row = (await screen.findByText('QT-1026-001')).closest('tr')!;
    expect(within(row).getByText('11.300.000 đ', norm)).toBeInTheDocument();
    expect(within(row).getByText('Xã trả công ty')).toBeInTheDocument();
    expect(within(row).getByText('Tiền mặt')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lập phiếu/ })).not.toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: 'In QT-1026-001' }));
    expect(await screen.findByText('PHIẾU QUYẾT TOÁN')).toBeInTheDocument();
    expect(screen.getByText('Mười một triệu ba trăm nghìn đồng')).toBeInTheDocument();
  });
});

describe('Xã trả lại công ty', () => {
  // DV02: phải nộp xã -228.000, xã đã trả 100.000, còn phải trả 128.000.
  const dv02 = { ...dv01, companyId: 2, companyCode: 'DV02', companyName: 'Công ty Hai', collected: 1_000_000, cashCollected: 0,
    retained: 228_000, payable: -228_000, received: 0, remaining: -228_000, gap: 228_000, communePaid: 100_000,
    communeOwed: 128_000, progress: 'PAID_IN_FULL', reconciliation: 'PENDING' };

  it('Tiến độ thu không còn hiện xã trả lại (xem ở Đối soát)', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/ledger': () => jsonResponse(200, [dv02]),
      'GET /api/remittance/area-progress': () => jsonResponse(200, []),
    });
    renderApp('/commune/progress');

    await screen.findByText('Công ty Hai');
    expect(screen.queryByText(/Xã trả lại công ty/)).not.toBeInTheDocument();
  });
});
