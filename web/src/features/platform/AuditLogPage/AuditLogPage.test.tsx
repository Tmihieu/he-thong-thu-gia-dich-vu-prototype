import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { pickDate, pickOption } from '../../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';

const admin = { id: 1, username: 'admin', fullName: 'Quản trị hệ thống', role: 'ADMIN', companyId: null };
const payment = {
  id: 12,
  occurredAt: '2026-10-12T17:40:00+07:00',
  actorUsername: 'thu07',
  actorRole: 'COLLECTOR',
  action: 'RECORD_PAYMENT',
  entityType: 'Charge',
  entityId: 'KT-1026-000001',
  beforeData: '{"status": "UNPAID", "paid": 0}',
  afterData: 'không phải JSON',
  ipAddress: '10.0.0.7',
};
const citizenPayment = {
  ...payment,
  id: 13,
  actorUsername: 'citizen:0901234567',
  actorRole: 'CITIZEN',
  action: 'RECORD_CITIZEN_PAYMENT',
  entityId: 'KT-1026-000002',
  ipAddress: null,
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-admin');
});
afterEach(() => vi.unstubAllGlobals());

describe('Nhật ký', () => {
  it('hiện dòng nhật ký, mở dòng thấy JSON trước/sau, bộ lọc gửi lên máy chủ', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/platform/audit-logs': () =>
        jsonResponse(200, { items: [payment, citizenPayment], total: 2, page: 0, size: 20 }),
    });
    renderApp('/admin/logs');

    // Mã hành động và loại đối tượng hiện bằng nhãn tiếng Việt.
    expect(await screen.findByText('Ghi nhận thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Người dân thanh toán trên app')).toBeInTheDocument();
    expect(screen.getAllByText('12/10/2026 17:40')).toHaveLength(2);
    expect(screen.getByText('Người đi thu')).toBeInTheDocument();
    expect(screen.getByText('Khoản phải thu của hộ · KT-1026-000001')).toBeInTheDocument();
    // Vai trò người dân (app) không phải vai trò đăng nhập web nhưng vẫn có nhãn tiếng Việt.
    expect(screen.getByText('Người dân')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /mở rộng|expand/i })[0]);
    expect(await screen.findByText(/"status": "UNPAID"/)).toBeInTheDocument();
    expect(screen.getByText('không phải JSON')).toBeInTheDocument();

    await pickOption(screen.getByRole('combobox', { name: 'Lọc theo hành động' }), 'Ghi nhận thanh toán');
    pickDate(screen.getByPlaceholderText('Từ ngày'), '01/10/2026');
    pickDate(screen.getByPlaceholderText('Đến ngày'), '31/10/2026');
    await waitFor(() => {
      const last = new URL(String(fetchFn.mock.calls.at(-1)![0]), 'http://localhost');
      expect(last.pathname).toBe('/api/platform/audit-logs');
      expect(Object.fromEntries(last.searchParams)).toEqual({
        from: '2026-10-01',
        to: '2026-10-31',
        action: 'RECORD_PAYMENT',
        page: '0',
        size: '20',
      });
    });
  });
});
