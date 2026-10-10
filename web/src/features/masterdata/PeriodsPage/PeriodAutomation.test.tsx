import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';

const draft = { id: 9, code: '2026-11', periodType: 'MONTH', label: 'Tháng 11/2026', startDate: '2026-11-01',
  endDate: '2026-11-30', openDate: '2026-11-01', dueDate: '2026-12-10', tariffVersionId: 1,
  tariffVersionCode: 'BG-65-2026', status: 'DRAFT', lockedAt: null, note: null };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'admin-token');
});
afterEach(() => vi.unstubAllGlobals());

it('admin saves the rule, generates a draft and reviews individual charges before confirming publication', async () => {
  let rule = { enabled: true, periodType: 'MONTH', createDay: 1, remitDueDays: 10, updatedAt: '2026-10-01T00:00:00Z' };
  let drafts: typeof draft[] = [];
  const result = { chargeCount: 1, exemptCount: 0, totalAmount: 80000, warningCount: 0, skipped: [],
    skippedByReason: {}, requestCode: null, plannedCharges: [{ subjectId: 1, subjectCode: 'HO-01',
      subjectName: 'Hộ xem trước', areaName: 'Ấp 01', companyCode: 'DV01', amount: 80000, exempt: false }] };
  const fetch = mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, { id: 1, username: 'admin', fullName: 'Quản trị', role: 'ADMIN', companyId: null }),
    'GET /api/masterdata/periods': () => jsonResponse(200, []),
    'GET /api/masterdata/periods/drafts': () => jsonResponse(200, drafts),
    'GET /api/masterdata/tariffs': () => jsonResponse(200, []),
    'GET /api/masterdata/period-rule': () => jsonResponse(200, rule),
    'PUT /api/masterdata/period-rule': (_, init) => {
      rule = { ...rule, ...JSON.parse(String(init.body)), updatedAt: '2026-10-09T00:00:00Z' };
      return jsonResponse(200, rule);
    },
    'POST /api/masterdata/period-rule/run': () => {
      drafts = [draft];
      return jsonResponse(200, { created: true, message: 'Đã tạo kỳ dự thảo', period: draft });
    },
    'POST /api/billing/periods/9/draft-preview': () => jsonResponse(200, { period: draft, result }),
    'POST /api/billing/periods/9/publish': () => {
      drafts = [];
      return jsonResponse(200, { period: { ...draft, status: 'COLLECTING' }, result: { ...result, requestCode: 'YCT-01' } });
    },
  });
  renderApp('/admin/config');
  const day = await screen.findByLabelText('Ngày tạo kỳ (hằng tháng)');
  fireEvent.change(day, { target: { value: '5' } });
  expect(screen.getByRole('button', { name: 'Chạy thử ngay' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Lưu quy tắc' }));
  await waitFor(() => expect(rule.createDay).toBe(5));
  await userEvent.click(screen.getByRole('button', { name: 'Chạy thử ngay' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Xem trước & mở kỳ' }));
  const drawer = await screen.findByRole('dialog');
  expect(await within(drawer).findByText('Hộ xem trước')).toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/publish'))).toBe(false);
  await userEvent.click(within(drawer).getByRole('button', { name: 'Mở kỳ & phát hành 1 khoản' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Mở kỳ & phát hành' }));
  expect(await within(drawer).findByText('Đã mở kỳ Tháng 11/2026')).toBeInTheDocument();
});
