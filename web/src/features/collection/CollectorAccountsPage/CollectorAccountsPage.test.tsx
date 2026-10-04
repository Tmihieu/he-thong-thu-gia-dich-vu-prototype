import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function baseApi(extra: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, manager),
    'GET /api/platform/collector-accounts': () => jsonResponse(200, [account({}), account({ id: 31, username: 'thu09', fullName: 'Người thu KV09', status: 'LOCKED' })]),
    ...extra,
  });
}

const callsOf = (fetchFn: ReturnType<typeof mockApi>, method: string) =>
  fetchFn.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === method);

describe('Người đi thu (công ty)', () => {
  it('liệt kê người đi thu của công ty kèm trạng thái khóa', async () => {
    baseApi();
    renderApp('/company/collectors');

    expect(await screen.findByText('Người thu KV07')).toBeInTheDocument();
    expect(screen.getByText('Người thu KV09')).toBeInTheDocument();
    expect(screen.getByText('Đã khóa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Khóa thu07' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở khóa thu09' })).toBeInTheDocument();
  });

  it('không có ô chọn vai trò hay công ty; mật khẩu < 8 ký tự thì không gửi', async () => {
    const fetchFn = baseApi();
    renderApp('/company/collectors');

    await userEvent.click(await screen.findByRole('button', { name: '+ Thêm người đi thu' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Tên đăng nhập'), 'thu07b');
    await userEvent.type(within(dialog).getByLabelText('Họ và tên'), 'Người thu mới');
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu ban đầu'), '1234567');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await within(dialog).findByText('Từ 8 đến 72 ký tự')).toBeInTheDocument();
    expect(callsOf(fetchFn, 'POST')).toHaveLength(0);
  });

  it('tạo người đi thu chỉ gửi tên, liên hệ và mật khẩu', async () => {
    const fetchFn = baseApi({
      'POST /api/platform/collector-accounts': () => jsonResponse(201, account({ id: 32, username: 'thu07b' })),
    });
    renderApp('/company/collectors');

    await userEvent.click(await screen.findByRole('button', { name: '+ Thêm người đi thu' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Tên đăng nhập'), 'thu07b');
    await userEvent.type(within(dialog).getByLabelText('Họ và tên'), 'Người thu mới');
    await userEvent.type(within(dialog).getByLabelText('Điện thoại'), '0901234567');
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu ban đầu'), 'MatKhau@1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() => expect(callsOf(fetchFn, 'POST')).toHaveLength(1));
    expect(JSON.parse(String((callsOf(fetchFn, 'POST')[0]![1] as RequestInit).body))).toEqual({
      username: 'thu07b', fullName: 'Người thu mới', phone: '0901234567', password: 'MatKhau@1',
    });
  });

  it('lỗi từ máy chủ hiện trong popup', async () => {
    baseApi({
      'POST /api/platform/collector-accounts': () => jsonResponse(409, { code: 'USERNAME_TAKEN', message: 'Tên đăng nhập thu07 đã có.' }),
    });
    renderApp('/company/collectors');

    await userEvent.click(await screen.findByRole('button', { name: '+ Thêm người đi thu' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Tên đăng nhập'), 'thu07');
    await userEvent.type(within(dialog).getByLabelText('Họ và tên'), 'Trùng');
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu ban đầu'), 'MatKhau@1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Tên đăng nhập thu07 đã có.');
  });

  it('sửa gửi PUT tới đúng tài khoản; đặt lại mật khẩu gửi POST /password', async () => {
    const fetchFn = baseApi({
      'PUT /api/platform/collector-accounts/30': () => jsonResponse(200, account({ fullName: 'Tên mới' })),
      'POST /api/platform/collector-accounts/30/password': () => jsonResponse(200, account({})),
    });
    renderApp('/company/collectors');

    await userEvent.click(await screen.findByRole('button', { name: 'Sửa thu07' }));
    const dialog = await screen.findByRole('dialog');
    const name = within(dialog).getByLabelText('Họ và tên');
    await userEvent.clear(name);
    await userEvent.type(name, 'Tên mới');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(callsOf(fetchFn, 'PUT')).toHaveLength(1));
    expect(JSON.parse(String((callsOf(fetchFn, 'PUT')[0]![1] as RequestInit).body))).toEqual({ fullName: 'Tên mới' });
    expect(await screen.findByText('Đã lưu thu07')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu thu07' }));
    await userEvent.type(await screen.findByLabelText('Mật khẩu mới'), 'MoiHon@2026');
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại' }));
    await waitFor(() => expect(callsOf(fetchFn, 'POST')).toHaveLength(1));
    expect(JSON.parse(String((callsOf(fetchFn, 'POST')[0]![1] as RequestInit).body))).toEqual({ password: 'MoiHon@2026' });
  });
});
