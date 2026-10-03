import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { pickOption } from '../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const leader = { id: 3, username: 'lanhdao', fullName: 'Trần Văn Mẫu', role: 'LEADER', companyId: null };
const periods = [
  { id: 10, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
    lockedAt: null, note: null },
];
const row = (companyId: number, code: string, extra: Record<string, unknown> = {}) => ({
  companyId, companyCode: code, companyName: `Công ty ${code}`, periodId: 10, due: 1_000_000, chargeCount: 10, adjustment: 0,
  refunded: 0, collected: 1_000_000, received: 900_000, receiptCount: 1, remaining: 0, gap: 0, previousDebt: 0, overdue: false,
  collectionRate: 100, lowCollectionRate: false, remittedRate: 100, lowRemittedRate: false, progress: 'PAID_IN_FULL',
  reconciliation: 'MATCHED', retained: 100_000, payable: 900_000, ...extra,
});
const area = (areaId: number, code: string, companyId: number, companyCode: string, exemptCount: number) => ({
  areaId, areaCode: code, areaName: `Tổ ${code}`, districtCode: 'DTH', companyId, companyCode, due: 500_000, collected: 500_000,
  chargeCount: 5, paidCount: 4, exemptCount, subjectCount: 5, collectionRate: 100, lowCollectionRate: false, noCompany: false,
});

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-lanhdao');
  mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, leader),
    'GET /api/masterdata/periods': () => jsonResponse(200, periods),
    'GET /api/remittance/ledger': () =>
      jsonResponse(200, [row(1, 'DV01'), row(7, 'DV07', { due: 2_000_000, retained: 0, payable: 2_000_000, received: 2_000_000 })]),
    'GET /api/remittance/area-progress': () =>
      jsonResponse(200, [area(7, 'KV07', 1, 'DV01', 2), area(9, 'KV09', 1, 'DV01', 1), area(12, 'KV12', 7, 'DV07', 4)]),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('Báo cáo tổng hợp của lãnh đạo', () => {
  it('hiện phải nộp xã sau phần công ty giữ lại, số hộ miễn 100% và tổng toàn xã', async () => {
    renderApp('/leader/report');

    const dv01 = (await screen.findByText('DV01', { selector: 'span' })).closest('tr')!;
    expect(within(dv01).getByText(/công ty giữ/)).toBeInTheDocument();
    expect(within(dv01).getAllByText(/900\.000/).length).toBeGreaterThan(0); // phải nộp xã và đã nộp
    // DV01 có 2 + 1 khoản miễn ở hai tổ.
    expect(within(dv01).getByText('3')).toBeInTheDocument();
    const total = screen.getByText('Tổng toàn xã').closest('tr')!;
    expect(within(total).getByText('7')).toBeInTheDocument(); // 3 + 4 hộ miễn toàn xã
    expect(within(total).getAllByText(/3.000.000/).length).toBeGreaterThan(0); // phải thu toàn xã
  });

  it('lọc theo công ty thì bảng tổ và dòng tổng chỉ còn công ty đó', async () => {
    renderApp('/leader/report');
    await screen.findByText('Tổng toàn xã');

    await pickOption(screen.getByRole('combobox', { name: 'Công ty' }), 'DV07 · Công ty DV07');

    expect(await screen.findByText('Tổng (đã lọc)')).toBeInTheDocument();
    expect(screen.queryByText('KV07 · Tổ KV07')).not.toBeInTheDocument();
    expect(screen.getByText('KV12 · Tổ KV12')).toBeInTheDocument();
    const total = screen.getByText('Tổng (đã lọc)').closest('tr')!;
    expect(within(total).getAllByText(/2\.000\.000/).length).toBeGreaterThan(0);
    expect(within(total).getByText('4')).toBeInTheDocument();
  });

  it('lọc theo tổ chỉ thu hẹp bảng tiến độ theo tổ', async () => {
    renderApp('/leader/report');
    await screen.findByText('Tổng toàn xã');

    await pickOption(screen.getByRole('combobox', { name: 'Tổ' }), 'KV09 · Tổ KV09');

    expect(await screen.findByText('KV09 · Tổ KV09', { selector: 'td' })).toBeInTheDocument();
    expect(screen.queryByText('KV07 · Tổ KV07', { selector: 'td' })).not.toBeInTheDocument();
    expect(screen.getByText('Tổng toàn xã')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Tổ' }));
  });
});
