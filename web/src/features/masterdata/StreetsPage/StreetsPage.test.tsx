import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { pickOption } from '../../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';

const me = () => jsonResponse(200, { id: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN', companyId: null });
const areas = [
  { id: 1, code: 'AP01', name: 'Ấp 1', districtId: 1, districtCode: 'TTT', status: 'ACTIVE', subjectCount: 3 },
  { id: 2, code: 'AP02', name: 'Ấp 2', districtId: 1, districtCode: 'TTT', status: 'ACTIVE', subjectCount: 1 },
];
const toKy = { id: 10, name: 'Tô Ký', displayName: 'Tô Ký', kind: 'STREET', parentId: null, status: 'ACTIVE', areaIds: [1, 2], oldNames: [] };
const muc = {
  id: 11, name: 'Nguyễn Thị Mực', displayName: 'Nguyễn Thị Mực', kind: 'STREET', parentId: null, status: 'ACTIVE', areaIds: [2],
  oldNames: [{ name: 'Đông Thạnh 8', note: 'NQ 380/NQ-HĐND ngày 24/7/2025' }],
};
const hem19 = { id: 12, name: 'Hẻm 19', displayName: 'Hẻm 19 Tô Ký', kind: 'ALLEY', parentId: 10, status: 'ACTIVE', areaIds: [], oldNames: [] };
const group = { key: 'hem 99 to ky', name: 'Hẻm 99 Tô Ký', subjectCount: 3, pendingCount: 3, areaNames: ['Ấp 1'], sampleCodes: ['TTT-H000007'] };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'admin-token');
});
afterEach(() => vi.unstubAllGlobals());

it('danh mục: lọc theo ấp và tên cũ; đổi tên gửi văn bản đổi tên', async () => {
  let saved: unknown;
  mockApi({
    'GET /api/platform/auth/me': me,
    'GET /api/masterdata/areas': () => jsonResponse(200, areas),
    'GET /api/masterdata/streets': () => jsonResponse(200, [toKy, muc, hem19]),
    'PUT /api/masterdata/streets/10': (_, init) => {
      saved = JSON.parse(String(init.body));
      return jsonResponse(200, { ...toKy, name: 'Tô Ký Mới', displayName: 'Tô Ký Mới' });
    },
  });
  renderApp('/admin/streets');

  expect(await screen.findByText('Hẻm 19 Tô Ký')).toBeInTheDocument();
  expect(screen.getByText('Đông Thạnh 8')).toBeInTheDocument();
  // Gõ tên cũ (không dấu) vẫn ra đường mới.
  fireEvent.change(screen.getByLabelText('Tìm đường'), { target: { value: 'dong thanh 8' } });
  await waitFor(() => expect(screen.queryByText('Hẻm 19 Tô Ký')).not.toBeInTheDocument());
  expect(screen.getByText('Nguyễn Thị Mực')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tìm đường'), { target: { value: '' } });

  // Lọc Ấp 1: đường đi qua Ấp 1 và hẻm của nó; đường chỉ qua Ấp 2 bị ẩn.
  await pickOption(screen.getByRole('combobox', { name: 'Lọc ấp' }), 'Ấp 1');
  await waitFor(() => expect(screen.queryByText('Nguyễn Thị Mực')).not.toBeInTheDocument());
  expect(screen.getByText('Hẻm 19 Tô Ký')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Sửa Tô Ký' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Tên'), { target: { value: 'Tô Ký Mới' } });
  fireEvent.change(await within(dialog).findByLabelText('Văn bản đổi tên'), { target: { value: 'NQ 1/2026' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
  await waitFor(() => expect(saved).toEqual({ name: 'Tô Ký Mới', areaIds: [1, 2], status: 'ACTIVE', renameNote: 'NQ 1/2026' }));
});

it('chờ xác minh: thêm hẻm vào danh mục (gợi sẵn đường cha) rồi gắn cả nhóm hồ sơ', async () => {
  const calls: { path: string; body: unknown }[] = [];
  mockApi({
    'GET /api/platform/auth/me': me,
    'GET /api/masterdata/areas': () => jsonResponse(200, areas),
    'GET /api/masterdata/streets': () => jsonResponse(200, [toKy, muc, hem19]),
    'GET /api/masterdata/streets/pending': () => jsonResponse(200, [group]),
    'POST /api/masterdata/streets': (_, init) => {
      calls.push({ path: 'create', body: JSON.parse(String(init.body)) });
      return jsonResponse(201, { ...hem19, id: 13, name: 'Hẻm 99', displayName: 'Hẻm 99 Tô Ký' });
    },
    'POST /api/masterdata/streets/pending/link': (_, init) => {
      calls.push({ path: 'link', body: JSON.parse(String(init.body)) });
      return jsonResponse(200, { count: 3 });
    },
  });
  renderApp('/admin/streets');
  await userEvent.click(await screen.findByRole('tab', { name: 'Đường chờ xác minh' }));
  expect(await screen.findByText('3 chờ xác minh')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Thêm vào danh mục' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));

  expect(await screen.findByText('Đã gắn 3 hồ sơ vào danh mục.')).toBeInTheDocument();
  expect(calls).toEqual([
    { path: 'create', body: { name: 'Hẻm 99 Tô Ký', kind: 'ALLEY', parentId: 10, areaIds: [] } },
    { path: 'link', body: { key: 'hem 99 to ky', streetId: 13 } },
  ]);
});
