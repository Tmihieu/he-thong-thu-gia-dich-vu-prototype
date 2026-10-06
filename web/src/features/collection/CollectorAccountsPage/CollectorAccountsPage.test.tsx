import { screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';

const manager = { id: 5, username: 'dv01', fullName: 'Quản lý DV01', role: 'COMPANY_MANAGER', companyId: 1 };
const account = (over: object) => ({
  id: 30, username: 'thu07', fullName: 'Người thu KV07', role: 'COLLECTOR', companyId: 1, phone: null, email: null,
  organization: null, status: 'ACTIVE', lastLoginAt: null, ...over,
});

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-manager');
});
afterEach(() => vi.unstubAllGlobals());

describe('Người đi thu (công ty)', () => {
  it('chỉ xem: liệt kê người đi thu kèm trạng thái khóa, không có nút tạo, sửa, khóa, đặt lại mật khẩu', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, manager),
      'GET /api/platform/collector-accounts': () =>
        jsonResponse(200, [account({}), account({ id: 31, username: 'thu09', fullName: 'Người thu KV09', status: 'LOCKED' })]),
    });
    renderApp('/company/collectors');

    expect(await screen.findByText('Người thu KV07')).toBeInTheDocument();
    expect(screen.getByText('Người thu KV09')).toBeInTheDocument();
    expect(screen.getByText('Đã khóa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thêm người đi thu|Sửa|Khóa|Mở khóa|Đặt lại mật khẩu/ })).not.toBeInTheDocument();
  });
});
