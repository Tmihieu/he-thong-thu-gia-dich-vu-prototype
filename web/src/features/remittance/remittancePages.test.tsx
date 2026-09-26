import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const periods = [
  { id: 10, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
    lockedAt: null, note: null },
  { id: 8, code: '2026-08', periodType: 'MONTH', label: 'Tháng 08/2026', startDate: '2026-08-01', endDate: '2026-08-31',
    openDate: '2026-08-01', dueDate: '2026-08-31', tariffVersionId: 2, tariffVersionCode: 'BG-67-2025', status: 'LOCKED',
    lockedAt: '2026-09-05T03:00:00Z', note: null },
];
const dv01 = {
  companyId: 1, companyCode: 'DV01', companyName: 'Công ty MTĐT Đông Thạnh', periodId: 10, due: 1_600_000, chargeCount: 20,
  collected: 1_200_000, received: 1_000_000, receiptCount: 1, remaining: 600_000, gap: -200_000, previousDebt: 0,
  overdue: false, collectionRate: 75, lowCollectionRate: false, progress: 'PARTIAL', reconciliation: 'PENDING',
};
const dv07 = { ...dv01, companyId: 7, companyCode: 'DV07', companyName: 'Công ty Xanh Sài Gòn', due: 800_000, collected: 200_000,
  received: 0, receiptCount: 0, remaining: 800_000, gap: -200_000, previousDebt: 150_000, collectionRate: 25,
  lowCollectionRate: true, progress: 'OVERDUE', reconciliation: 'MISMATCH' };
const areas = [
  { areaId: 7, areaCode: 'KV07', areaName: 'Tổ dân phố 07', districtCode: 'DTH', companyId: 1, companyCode: 'DV01', due: 800_000,
    collected: 640_000, chargeCount: 10, paidCount: 8, subjectCount: 10, collectionRate: 80, lowCollectionRate: false, noCompany: false },
  { areaId: 24, areaCode: 'KV24', areaName: 'Tổ dân phố 24', districtCode: 'NB', companyId: null, companyCode: null, due: 0,
    collected: 0, chargeCount: 0, paidCount: 0, subjectCount: 9, collectionRate: 0, lowCollectionRate: false, noCompany: true },
];

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
  });
}

const norm = { normalizer: (s: string) => s.replace(/\s+/g, ' ').trim() };

describe('Tiến độ thu', () => {
  it('mặc định kỳ chưa khóa; DV01 nộp một phần, DV07 quá hạn và tỷ lệ thu thấp; cảnh báo tổ chưa có công ty', async () => {
    const fetchFn = api();
    renderApp('/commune/progress');

    expect(await screen.findByText('Nộp một phần')).toBeInTheDocument();
    expect(screen.getByText('Quá hạn nộp')).toBeInTheDocument();
    expect(screen.getByText('1 tổ chưa có công ty thu: KV24')).toBeInTheDocument();
    expect(screen.getAllByText('150.000 đ', norm)).toHaveLength(2);
    await waitFor(() =>
      expect(fetchFn.mock.calls.some(([url]) => String(url) === '/api/remittance/ledger?periodId=10')).toBe(true),
    );

    await userEvent.click(screen.getAllByRole('button', { name: /mở rộng|expand/i })[0]!);
    expect(await screen.findByText('KV07 · Tổ dân phố 07')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
  });
});

describe('Đối soát', () => {
  it('hiện chênh lệch "thu rồi chưa nộp" và trạng thái Đang nộp / Lệch', async () => {
    api();
    renderApp('/commune/reconciliation');

    expect(await screen.findByText('Đang nộp')).toBeInTheDocument();
    expect(screen.getByText('Lệch')).toBeInTheDocument();
    const dv01Row = screen.getByText('DV01 · Công ty MTĐT Đông Thạnh').closest('tr')!;
    expect(within(dv01Row).getByText('thu rồi chưa nộp')).toBeInTheDocument();
    expect(within(dv01Row).getByText('1 phiếu thu')).toBeInTheDocument();
    expect(screen.getAllByText('400.000 đ', norm).length).toBeGreaterThan(0);
  });
});

describe('Khóa kỳ', () => {
  it('còn công ty nợ thì hiện lý do tiếng Việt từ máy chủ', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods': () => jsonResponse(200, periods),
      'GET /api/remittance/ledger': () => jsonResponse(200, [dv01, dv07]),
      'POST /api/remittance/periods/10/lock': () =>
        jsonResponse(422, {
          code: 'PERIOD_HAS_DEBT',
          message: 'Chưa khóa được kỳ 2026-10 vì còn 2 công ty chưa nộp đủ: DV01: 600.000 đ; DV07: 800.000 đ.',
        }),
    });
    renderApp('/commune/reconciliation');

    await userEvent.click(await screen.findByRole('button', { name: /Khóa kỳ/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Khóa kỳ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('còn 2 công ty chưa nộp đủ: DV01: 600.000 đ; DV07: 800.000 đ');
    expect(fetchFn.mock.calls.some(([url]) => String(url) === '/api/remittance/periods/10/lock')).toBe(true);
  });
});
