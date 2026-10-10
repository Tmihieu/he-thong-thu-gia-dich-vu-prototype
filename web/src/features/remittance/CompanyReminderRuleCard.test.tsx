import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const admin = { id: 1, username: 'admin', fullName: 'Quản trị', role: 'ADMIN', companyId: null };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'admin-token');
});
afterEach(() => vi.unstubAllGlobals());

it('admin saves the schedule before previewing and confirms sending advance-payment reminders', async () => {
  let rule = { enabled: true, daysBeforeDue: 3, repeatEveryDays: 3 };
  let targets = [{ companyId: 1, companyCode: 'DV01', companyName: 'Công ty mẫu', periodId: 1,
    periodLabel: 'Tháng 10/2026', dueDate: '2026-10-31', remaining: 320000, overdue: false }];
  const fetch = mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, admin),
    'GET /api/remittance/reminder-rule': () => jsonResponse(200, rule),
    'GET /api/remittance/reminder-rule/preview': () => jsonResponse(200, targets),
    'PUT /api/remittance/reminder-rule': (_, init) => {
      rule = JSON.parse(String(init.body));
      return jsonResponse(200, rule);
    },
    'POST /api/remittance/reminder-rule/run': () => {
      targets = [];
      return jsonResponse(200, { sent: 1 });
    },
  });
  renderApp('/admin/config');
  await userEvent.click(await screen.findByRole('tab', { name: 'Nhắc công ty nộp tiền' }));
  expect(await screen.findByText('DV01 · Công ty mẫu')).toBeInTheDocument();
  expect(screen.getByText(/dù chưa thu được tiền từ hộ/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nhắc trước hạn nộp'), { target: { value: '5' } });
  expect(screen.getByRole('button', { name: 'Gửi nhắc ngay' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình nhắc nộp' }));
  await waitFor(() => expect(rule.daysBeforeDue).toBe(5));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Gửi nhắc ngay' })).toBeEnabled());
  await userEvent.click(screen.getByRole('button', { name: 'Gửi nhắc ngay' }));
  expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/reminder-rule/run'))).toBe(false);
  const confirmation = await screen.findByRole('tooltip');
  await userEvent.click(within(confirmation).getByRole('button', { name: 'Gửi nhắc' }));
  expect(await screen.findByText('Đã gửi 1 thông báo nhắc nộp')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText('DV01 · Công ty mẫu')).not.toBeInTheDocument());
});
