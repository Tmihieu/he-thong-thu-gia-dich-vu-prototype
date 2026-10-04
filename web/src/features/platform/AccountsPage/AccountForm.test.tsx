import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { pickOption } from '../../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';

const admin = { id: 1, username: 'admin', fullName: 'Quản trị hệ thống', role: 'ADMIN', companyId: null };
const companies = [
  { id: 1, code: 'DV01', name: 'Công ty MTĐT Đông Thạnh', contactName: 'A', contactPhone: '0900000001', status: 'ACTIVE',
    validFrom: '2026-01-01', validTo: null, orgType: null, taxCode: null, address: null, email: null,
    communeContractNo: null, bankAccount: null, bankName: null },
];
const account = (over: object) => ({
  id: 1, username: 'admin', fullName: 'Quản trị hệ thống', role: 'ADMIN', companyId: null, phone: null, email: null,
  organization: null, status: 'ACTIVE', lastLoginAt: null, ...over,
});
const thu07 = account({ id: 30, username: 'thu07', fullName: 'Người thu KV07', role: 'COLLECTOR', companyId: 1 });

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-admin');
});
afterEach(() => vi.unstubAllGlobals());

function baseApi(extra: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, admin),
    'GET /api/platform/users': () => jsonResponse(200, [account({}), thu07]),
    'GET /api/masterdata/companies': () => jsonResponse(200, companies),
    ...extra,
  });
}

const posts = (fetchFn: ReturnType<typeof mockApi>) =>
  fetchFn.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

describe('Tài khoản (quản trị)', () => {
  it('liệt kê tài khoản với công ty; không có nút khóa chính mình', async () => {
    baseApi();
    renderApp('/admin/accounts');

    expect(await screen.findByText('Người thu KV07')).toBeInTheDocument();
    expect(screen.getByText('DV01 · Công ty MTĐT Đông Thạnh')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Khóa' })).toHaveLength(1);
  });

  it('người đi thu bắt buộc chọn công ty và mật khẩu ≥ 8 ký tự, không gửi khi thiếu', async () => {
    const fetchFn = baseApi();
    renderApp('/admin/accounts');

    await userEvent.click(await screen.findByRole('button', { name: '+ Thêm tài khoản' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Tên đăng nhập'), 'thu07b');
    await userEvent.type(within(dialog).getByLabelText('Họ và tên'), 'Người thu mới');
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu ban đầu'), '1234567');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await within(dialog).findByText('Vui lòng chọn công ty')).toBeInTheDocument();
    expect(within(dialog).getByText('Từ 8 đến 72 ký tự')).toBeInTheDocument();
    expect(posts(fetchFn)).toHaveLength(0);
  });

  it('tạo người đi thu cho DV01 gửi đúng dữ liệu; vai trò xã thì ẩn ô công ty', async () => {
    const fetchFn = baseApi({
      'POST /api/platform/users': () => jsonResponse(201, account({ id: 31, username: 'thu07b', role: 'COLLECTOR', companyId: 1 })),
    });
    renderApp('/admin/accounts');

    await userEvent.click(await screen.findByRole('button', { name: '+ Thêm tài khoản' }));
    const dialog = await screen.findByRole('dialog');
    await pickOption(within(dialog).getByRole('combobox', { name: 'Vai trò' }), 'Cán bộ xã');
    expect(within(dialog).queryByRole('combobox', { name: 'Công ty' })).not.toBeInTheDocument();
    await pickOption(within(dialog).getByRole('combobox', { name: 'Vai trò' }), 'Người đi thu');
    await pickOption(within(dialog).getByRole('combobox', { name: 'Công ty' }), 'DV01 · Công ty MTĐT Đông Thạnh');
    await userEvent.type(within(dialog).getByLabelText('Tên đăng nhập'), 'thu07b');
    await userEvent.type(within(dialog).getByLabelText('Họ và tên'), 'Người thu mới');
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu ban đầu'), 'MatKhau@1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() => expect(posts(fetchFn)).toHaveLength(1));
    expect(JSON.parse(String((posts(fetchFn)[0]![1] as RequestInit).body))).toEqual({
      username: 'thu07b', fullName: 'Người thu mới', role: 'COLLECTOR', companyId: 1, password: 'MatKhau@1',
    });
  });

  it('lỗi từ máy chủ hiện trong popup', async () => {
    baseApi({
      'POST /api/platform/users': () => jsonResponse(409, { code: 'USERNAME_TAKEN', message: 'Tên đăng nhập thu07 đã có.' }),
    });
    renderApp('/admin/accounts');

    await userEvent.click(await screen.findByRole('button', { name: '+ Thêm tài khoản' }));
    const dialog = await screen.findByRole('dialog');
    await pickOption(within(dialog).getByRole('combobox', { name: 'Công ty' }), 'DV01 · Công ty MTĐT Đông Thạnh');
    await userEvent.type(within(dialog).getByLabelText('Tên đăng nhập'), 'thu07');
    await userEvent.type(within(dialog).getByLabelText('Họ và tên'), 'Trùng');
    await userEvent.type(within(dialog).getByLabelText('Mật khẩu ban đầu'), 'MatKhau@1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Tên đăng nhập thu07 đã có.');
  });
});
