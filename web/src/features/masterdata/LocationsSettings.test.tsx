import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'admin-token');
});
afterEach(() => vi.unstubAllGlobals());

it('sửa địa bàn và khu vực từ Cấu hình, cập nhật bảng sau khi lưu', async () => {
  let district = { id: 1, code: 'DTH', name: 'Đông Thạnh', note: null, sortOrder: 1 };
  let area = { id: 1, code: 'KV01', name: 'Tổ 1', districtId: 1, districtCode: 'DTH', status: 'ACTIVE', subjectCount: 10 };
  const fetchFn = mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, { id: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN', companyId: null }),
    'GET /api/masterdata/periods': () => jsonResponse(200, []),
    'GET /api/masterdata/districts': () => jsonResponse(200, [district]),
    'GET /api/masterdata/areas': () => jsonResponse(200, [area]),
    'PUT /api/masterdata/districts/1': (_, init) => {
      district = { ...district, ...JSON.parse(String(init.body)) };
      return jsonResponse(200, district);
    },
    'PUT /api/masterdata/areas/1': (_, init) => {
      area = { ...area, ...JSON.parse(String(init.body)) };
      return jsonResponse(200, area);
    },
  });
  renderApp('/admin/config');
  await userEvent.click(await screen.findByRole('tab', { name: 'Thiết lập địa bàn' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Sửa địa bàn DTH' }));
  let dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Tên địa bàn'), { target: { value: 'Đông Thạnh mới' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
  expect(await screen.findByText('Đã lưu địa bàn')).toBeInTheDocument();
  expect(await screen.findAllByText('Đông Thạnh mới')).not.toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Sửa khu vực KV01' }));
  dialog = (await screen.findAllByRole('dialog')).at(-1)!;
  fireEvent.change(within(dialog).getByLabelText('Tên khu vực'), { target: { value: 'Tổ dân phố 1' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
  expect(await screen.findByText('Đã lưu khu vực')).toBeInTheDocument();
  expect(await screen.findByText('Tổ dân phố 1')).toBeInTheDocument();
  expect(fetchFn.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(2);
});

it('giữ form và hiển thị lỗi khi lưu địa bàn thất bại', async () => {
  mockApi({
    'GET /api/platform/auth/me': () => jsonResponse(200, { id: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN', companyId: null }),
    'GET /api/masterdata/periods': () => jsonResponse(200, []),
    'GET /api/masterdata/districts': () => jsonResponse(200, [{ id: 1, code: 'DTH', name: 'Đông Thạnh', note: null, sortOrder: 1 }]),
    'GET /api/masterdata/areas': () => jsonResponse(200, []),
    'PUT /api/masterdata/districts/1': () => jsonResponse(403, { code: 'FORBIDDEN', message: 'Bạn không có quyền sửa địa bàn.' }),
  });
  renderApp('/admin/config');
  await userEvent.click(await screen.findByRole('tab', { name: 'Thiết lập địa bàn' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Sửa địa bàn DTH' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Bạn không có quyền sửa địa bàn.');
});
