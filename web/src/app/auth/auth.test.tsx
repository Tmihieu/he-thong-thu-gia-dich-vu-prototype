import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';
import { TOKEN_KEY } from './authContext';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const company = { id: 5, username: 'dv01', fullName: 'Công ty DV01', role: 'COMPANY_MANAGER', companyId: 1 };

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

async function fillLogin(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Tên đăng nhập'), username);
  await user.type(screen.getByLabelText('Mật khẩu'), password);
  await user.click(screen.getByRole('button', { name: /Đăng nhập/ }));
}

describe('đăng nhập', () => {
  it('sai mật khẩu hiện thông báo tiếng Việt từ máy chủ và không lưu token', async () => {
    mockApi({
      'POST /api/platform/auth/login': () =>
        jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng.' }),
    });
    renderApp('/login');

    await fillLogin('canbo_xa', 'sai');

    expect(await screen.findByRole('alert')).toHaveTextContent('Tên đăng nhập hoặc mật khẩu không đúng.');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('bỏ trống thì báo lỗi ngay trên form', async () => {
    mockApi({});
    renderApp('/login');
    await userEvent.setup().click(await screen.findByRole('button', { name: /Đăng nhập/ }));
    expect(await screen.findByText('Vui lòng nhập tên đăng nhập')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập mật khẩu')).toBeInTheDocument();
  });

  it('đúng mật khẩu thì lưu token và vào trang chính với menu của vai trò', async () => {
    const fetchFn = mockApi({
      'POST /api/platform/auth/login': () =>
        jsonResponse(200, { accessToken: 'tok-1', tokenType: 'Bearer', expiresAt: '2026-10-01T08:00:00Z', user: officer }),
    });
    const { router } = renderApp('/login');

    await fillLogin('canbo_xa', 'Demo@2026');

    await waitFor(() => expect(router.state.location.pathname).toBe('/commune/subjects'));
    const menu = await screen.findByRole('menu', { name: 'Menu chính' });
    expect(within(menu).getByText('Đối soát')).toBeInTheDocument();
    expect(within(menu).queryByText('Nhật ký')).not.toBeInTheDocument();
    expect(screen.getByText('Nguyễn Thị Mẫu')).toBeInTheDocument();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('tok-1');
    const body = JSON.parse(String((fetchFn.mock.calls[0]![1] as RequestInit).body));
    expect(body).toEqual({ username: 'canbo_xa', password: 'Demo@2026' });
  });
});

describe('bảo vệ route', () => {
  it('chưa đăng nhập vào trang nội bộ thì về trang đăng nhập', async () => {
    mockApi({});
    const { router } = renderApp('/admin/accounts');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('vào URL của vai trò khác thì ra trang 403', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok-dv01');
    mockApi({ 'GET /api/platform/auth/me': () => jsonResponse(200, company) });
    renderApp('/commune/reconciliation');

    expect(await screen.findByText('Bạn không có quyền truy cập trang này.')).toBeInTheDocument();
  });

  it('đúng vai trò thì thấy layout và trang đang xây dựng', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
    mockApi({ 'GET /api/platform/auth/me': () => jsonResponse(200, officer) });
    renderApp('/commune/companies');

    expect(await screen.findByText(/Đang xây dựng/)).toBeInTheDocument();
    expect(within(screen.getByRole('menu', { name: 'Menu chính' })).getByText('Hồ sơ hộ')).toBeInTheDocument();
  });

  it('token hết hạn/sai (401 từ /me) thì xóa token và về trang đăng nhập', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok-het-han');
    mockApi({
      'GET /api/platform/auth/me': () =>
        jsonResponse(401, { code: 'UNAUTHORIZED', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }),
    });
    const { router } = renderApp('/commune/subjects');

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('gốc "/" chuyển tới trang chính của vai trò đang đăng nhập', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
    mockApi({ 'GET /api/platform/auth/me': () => jsonResponse(200, officer) });
    const { router } = renderApp('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/commune/subjects'));
  });

  it('đăng xuất xóa token và về trang đăng nhập', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
    mockApi({ 'GET /api/platform/auth/me': () => jsonResponse(200, officer) });
    const { router } = renderApp('/commune/areas');

    await userEvent.setup().click(await screen.findByRole('button', { name: /Đăng xuất/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
