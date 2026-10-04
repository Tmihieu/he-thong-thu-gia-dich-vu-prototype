import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const leader = { id: 3, username: 'lanhdao', fullName: 'Trần Văn Mẫu', role: 'LEADER', companyId: null };
const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const periods = [
  { id: 10, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
    lockedAt: null, note: null },
];
const ledgerRow = (companyId: number, code: string, extra: Record<string, unknown> = {}) => ({
  companyId, companyCode: code, companyName: `Công ty ${code}`, periodId: 10, due: 1_000_000, chargeCount: 10, adjustment: 0,
  refunded: 0, collected: 600_000, received: 400_000, receiptCount: 1, remaining: 600_000, gap: -200_000, previousDebt: 0,
  overdue: false, collectionRate: 60, lowCollectionRate: false, remittedRate: 40, lowRemittedRate: true, progress: 'PARTIAL',
  reconciliation: 'PENDING', retained: 0, payable: 1_000_000, ...extra,
});
const approval = {
  id: 7, code: 'DN-1026-001', type: 'WRITE_OFF', status: 'PENDING', subjectCode: 'DTH-H000128', subjectName: 'Hộ Nguyễn Văn An',
  contractNo: null, chargeId: 5, chargeCode: 'KT-1026-DTH-H000128', periodCode: '2026-10', companyCode: 'DV01',
  chargeAmount: 80_000, amount: null, reason: 'Hộ chuyển đi', decisionNo: null, requestedByName: 'Nguyễn Thị Mẫu',
  requestedAt: '2026-10-12T02:00:00Z', decidedByName: null, decidedAt: null, decisionNote: null, effectivePeriodCode: null,
};

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

function lastPost(fetchFn: ReturnType<typeof mockApi>, path: string) {
  const call = fetchFn.mock.calls.filter(([url, init]) => String(url) === path && (init as RequestInit | undefined)?.method === 'POST').at(-1);
  return call ? (JSON.parse(String((call[1] as RequestInit).body)) as Record<string, unknown>) : undefined;
}

describe('Lãnh đạo', () => {
  beforeEach(() => sessionStorage.setItem(TOKEN_KEY, 'tok-lanhdao'));

  function api() {
    return mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, leader),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/ledger': () =>
        jsonResponse(200, [ledgerRow(1, 'DV01', { overdue: true, previousDebt: 150_000, progress: 'OVERDUE' }),
          ledgerRow(7, 'DV07', { collectionRate: 30, lowCollectionRate: true })]),
      'GET /api/remittance/area-progress': () => jsonResponse(200, []),
      'GET /api/leadership/approvals': () => jsonResponse(200, [approval]),
      'POST /api/leadership/approvals/7/reject': (_url, init) =>
        jsonResponse(200, { ...approval, status: 'REJECTED', decisionNote: JSON.parse(String(init.body)).note }),
      'POST /api/leadership/approvals/7/approve': () => jsonResponse(200, { ...approval, status: 'APPROVED' }),
    });
  }

  it('vào thẳng dashboard: tổng kỳ và 2 nhóm cảnh báo', async () => {
    api();
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Dashboard điều hành' })).toBeInTheDocument();
    const alerts = (await screen.findByText('Cảnh báo')).closest('.ant-card')!;
    expect(await within(alerts as HTMLElement).findByText('Nộp chậm / nợ kỳ trước')).toBeInTheDocument();
    expect(await within(alerts as HTMLElement).findByText('DV01')).toBeInTheDocument();
    expect(within(alerts as HTMLElement).getByText('DV07')).toBeInTheDocument();
    expect(screen.queryByText('Đề nghị chờ duyệt')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Khóa kỳ/ })).not.toBeInTheDocument();
  });

  it('màn tiến độ và đối soát chỉ đọc: không nhắc nộp, không khóa kỳ', async () => {
    api();
    renderApp('/leader/progress');
    expect(await screen.findByText('Quá hạn nộp')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nhắc nộp/ })).not.toBeInTheDocument();
  });
});

describe('Cán bộ xã lập đề nghị xóa nợ', () => {
  beforeEach(() => sessionStorage.setItem(TOKEN_KEY, 'tok-canbo'));

  it('từ màn Khoản thu, gửi đúng khoản và lý do', async () => {
    const charge = {
      id: 5, code: 'KT-1026-DTH-H000128', requestCode: 'YCT-1026-001', subjectId: 1, subjectCode: 'DTH-H000128',
      subjectName: 'Hộ Nguyễn Văn An', subjectAddress: '1 Đường Mẫu', areaId: 7, areaCode: 'KV07', companyId: 1,
      companyCode: 'DV01', periodId: 10, periodCode: '2026-10', feeTypeCode: 'ENV', tariffGroup: 'HH_3_PLUS',
      unitPrice: 80_000, months: 1, amount: 80_000, dueDate: '2026-10-25', status: 'UNPAID', overdue: false, refunded: 0,
    };
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/masterdata/areas': () => jsonResponse(200, []),
      'GET /api/masterdata/companies': () => jsonResponse(200, []),
      'GET /api/billing/charge-requests': () => jsonResponse(200, []),
      'GET /api/billing/charges': () => jsonResponse(200, { items: [charge], total: 1, page: 0, size: 50 }),
      'POST /api/leadership/approvals': () => jsonResponse(201, approval),
    });
    renderApp('/commune/charges?tab=charges');

    await userEvent.click(await screen.findByRole('button', { name: 'Đề nghị xóa nợ KT-1026-DTH-H000128' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Lý do'), 'Hộ chuyển đi');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi lãnh đạo duyệt' }));
    await waitFor(() =>
      expect(lastPost(fetchFn, '/api/leadership/approvals')).toEqual({ type: 'WRITE_OFF', chargeId: 5, reason: 'Hộ chuyển đi' }),
    );
  });

  it('đề nghị hoàn: hạn mức = số tiền khoản trừ phần đã hoàn, hiện số đã hoàn', async () => {
    const charge = {
      id: 6, code: 'KT-1026-DTH-H000129', requestCode: 'YCT-1026-001', subjectId: 2, subjectCode: 'DTH-H000129',
      subjectName: 'Hộ Lê Thị Bình', subjectAddress: '2 Đường Mẫu', areaId: 7, areaCode: 'KV07', companyId: 1,
      companyCode: 'DV01', periodId: 10, periodCode: '2026-10', feeTypeCode: 'ENV', tariffGroup: 'HH_3_PLUS',
      unitPrice: 80_000, months: 1, amount: 80_000, dueDate: '2026-10-25', status: 'PAID', overdue: false, refunded: 30_000,
    };
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/masterdata/areas': () => jsonResponse(200, []),
      'GET /api/masterdata/companies': () => jsonResponse(200, []),
      'GET /api/billing/charge-requests': () => jsonResponse(200, []),
      'GET /api/billing/charges': () => jsonResponse(200, { items: [charge], total: 1, page: 0, size: 50 }),
    });
    renderApp('/commune/charges?tab=charges');

    await userEvent.click(await screen.findByRole('button', { name: 'Đề nghị hoàn KT-1026-DTH-H000129' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/đã hoàn 30.000/)).toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton')).toHaveValue('50.000');
  });
});
