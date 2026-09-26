import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { pickDate, pickOption } from '../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const period = {
  id: 5, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
  openDate: '2026-10-01', dueDate: '2026-10-31', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'OPEN',
  lockedAt: null, note: null,
};
const feeTypes = [{ id: 1, code: 'ENV', name: 'Phí vệ sinh môi trường (CTRSH)', pricingMode: 'TARIFF', defaultPrice: null, active: true }];
const previewResult = {
  requestCode: null, chargeCount: 219, exemptCount: 6, totalAmount: 17_000_000, warningCount: 9,
  skipped: [{ subjectId: 300, subjectCode: 'NB-H000461', subjectName: 'Hộ Mẫu', areaCode: 'KV24', reason: 'AREA_WITHOUT_COMPANY',
    warning: true, message: 'Khu vực KV24 chưa có công ty phụ trách.' }],
};
const charge = {
  id: 1, code: 'KT-1026-DTH-H000128', requestCode: 'YCT-1026-01', subjectId: 128, subjectCode: 'DTH-H000128',
  subjectName: 'Nguyễn Văn Mẫu', subjectAddress: 'Số 1', areaId: 7, areaCode: 'KV07', companyId: 1, companyCode: 'DV01',
  periodId: 5, periodCode: '2026-10', feeTypeCode: 'ENV', tariffGroup: 'HH_3_PLUS', unitPrice: 80000, months: 1,
  amount: 80000, dueDate: '2026-09-25', status: 'UNPAID', overdue: true,
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
});
afterEach(() => vi.unstubAllGlobals());

function baseApi(publish: () => Response) {
  return mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, officer),
    'GET /api/masterdata/periods': () => jsonResponse(200, [period]),
    'GET /api/masterdata/fee-types': () => jsonResponse(200, feeTypes),
    'GET /api/masterdata/areas': () => jsonResponse(200, []),
    'GET /api/masterdata/companies': () => jsonResponse(200, []),
    'GET /api/billing/charge-requests': () => jsonResponse(200, []),
    'GET /api/billing/charges': () => jsonResponse(200, { items: [charge], total: 1, page: 0, size: 50 }),
    'POST /api/billing/charge-requests/preview': () => jsonResponse(200, previewResult),
    'POST /api/billing/charge-requests': publish,
  });
}

async function fillAndPreview() {
  await pickOption(await screen.findByRole('combobox', { name: 'Kỳ thu' }), 'Tháng 10/2026 (BG-65-2026)');
  pickDate(screen.getByLabelText('Hạn hộ đóng'), '25/10/2026');
  await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }));
}

describe('Khoản thu · phiếu YCT', () => {
  it('xem trước hiện số khoản, tổng tiền, cảnh báo tổ chưa có công ty; phát hành thành công', async () => {
    baseApi(() => jsonResponse(201, { ...previewResult, requestCode: 'YCT-1026-01' }));
    renderApp('/commune/charges');

    await fillAndPreview();

    expect(await screen.findByText('219')).toBeInTheDocument();
    expect(screen.getByText('17.000.000 đ', { normalizer: (s) => s.replace(/\s+/g, ' ') })).toBeInTheDocument();
    expect(screen.getByText(/9 hộ ở tổ chưa có công ty/)).toBeInTheDocument();
    expect(screen.getByText('Khu vực KV24 chưa có công ty phụ trách.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Phát hành 219 khoản' }));
    expect(await screen.findByText('Đã phát hành phiếu YCT-1026-01')).toBeInTheDocument();
  });

  it('phát hành lần hai báo "Không có khoản mới", không lỗi', async () => {
    baseApi(() => jsonResponse(200, { ...previewResult, chargeCount: 0, requestCode: null }));
    renderApp('/commune/charges');

    await fillAndPreview();
    await userEvent.click(await screen.findByRole('button', { name: 'Phát hành 219 khoản' }));

    expect(await screen.findByText('Không có khoản mới')).toBeInTheDocument();
    expect(screen.queryByRole('alert', { name: /lỗi/i })).not.toBeInTheDocument();
  });

  it('tab khoản thu hiện "Quá hạn" theo hạn đóng', async () => {
    baseApi(() => jsonResponse(500, {}));
    renderApp('/commune/charges');

    await userEvent.click(await screen.findByRole('tab', { name: 'Khoản thu' }));
    expect(await screen.findByText('KT-1026-DTH-H000128')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Quá hạn')).toBeInTheDocument());
    expect(screen.getByText('HGĐ ≥ 3 người')).toBeInTheDocument();
  });
});
