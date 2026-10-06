import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const admin = { id: 1, username: 'admin', fullName: 'Quản trị hệ thống', role: 'ADMIN', companyId: null };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-admin');
});
afterEach(() => vi.unstubAllGlobals());

describe('Cấu hình · tài khoản nhận chuyển khoản của xã (UC-54)', () => {
  it('chưa khai (404) thì báo chưa khai; lưu gửi PUT với ngân hàng, số tài khoản, chủ tài khoản', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, admin),
      'GET /api/masterdata/commune-bank-account': () =>
        jsonResponse(404, { code: 'COMMUNE_BANK_ACCOUNT_MISSING', message: 'Xã chưa khai tài khoản nhận chuyển khoản.' }),
      'PUT /api/masterdata/commune-bank-account': (_url, init) => jsonResponse(200, JSON.parse(String(init.body))),
    });
    renderApp('/admin/config');

    await userEvent.click(await screen.findByRole('tab', { name: 'Tài khoản nhận chuyển khoản' }));
    expect(await screen.findByText('Xã chưa khai tài khoản nhận chuyển khoản')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Ngân hàng'), 'Vietcombank');
    await userEvent.type(screen.getByLabelText('Số tài khoản'), '0071000888888');
    await userEvent.type(screen.getByLabelText('Tên chủ tài khoản'), 'UBND xã Đông Thạnh');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => {
      const put = fetchFn.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');
      expect(JSON.parse(String((put![1] as RequestInit).body))).toEqual({
        bankName: 'Vietcombank', accountNumber: '0071000888888', accountHolder: 'UBND xã Đông Thạnh',
      });
    });
  });
});
