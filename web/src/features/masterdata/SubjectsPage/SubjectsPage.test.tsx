import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { pickDate } from '../../../test/antd';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const areas = [{ id: 7, code: 'KV07', name: 'Tổ dân phố 07', districtId: 1, districtCode: 'DTH', status: 'ACTIVE', subjectCount: 1 }];
const subject = {
  id: 128, code: 'DTH-H000128', subjectType: 'HOUSEHOLD', name: 'Nguyễn Văn Mẫu', address: 'Số 12 đường Mẫu',
  areaId: 7, areaCode: 'KV07', districtCode: 'DTH', phone: '0902000128', status: 'ACTIVE', memberCount: 4,
  representativeName: null, taxCode: null, note: null,
  currentContract: { id: 62, contractNo: 'ĐK-DTH-0062', tariffGroup: 'HH_3_PLUS', validFrom: '2026-01-01', validTo: null,
    exempt: false, exemptReason: null, exemptDecisionNo: null, note: null },
  contracts: [],
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
});
afterEach(() => vi.unstubAllGlobals());

describe('Hồ sơ hộ (cán bộ xã)', () => {
  it('danh sách hiện nhóm giá và trạng thái; tìm kiếm gửi từ khóa lên máy chủ', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/areas': () => jsonResponse(200, areas),
      'GET /api/masterdata/subjects': () => jsonResponse(200, { items: [subject], total: 1, page: 0, size: 20 }),
    });
    renderApp('/commune/subjects');

    expect(await screen.findByRole('button', { name: 'DTH-H000128' })).toBeInTheDocument();
    expect(screen.getByText('HGĐ ≥ 3 người')).toBeInTheDocument();
    expect(screen.getByText('Đang cung cấp')).toBeInTheDocument();

    const search = screen.getByRole('searchbox', { name: 'Tìm hồ sơ' });
    fireEvent.change(search, { target: { value: '000128' } });
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' });
    await waitFor(() =>
      expect(fetchFn.mock.calls.some(([url]) => String(url).includes('q=000128'))).toBe(true),
    );
  });

  it('sửa hồ sơ ghi xuống hai API: đối tượng rồi hợp đồng', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/areas': () => jsonResponse(200, areas),
      'GET /api/masterdata/subjects': () => jsonResponse(200, { items: [subject], total: 1, page: 0, size: 20 }),
      'PUT /api/masterdata/subjects/128': () => jsonResponse(200, subject),
      'PUT /api/masterdata/contracts/62': () => jsonResponse(200, subject.currentContract),
    });
    renderApp('/commune/subjects');

    await userEvent.click(await screen.findByRole('button', { name: 'DTH-H000128' }));
    const drawer = await screen.findByRole('dialog');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Lưu hồ sơ' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const writes = fetchFn.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT').map(([url]) => url);
    expect(writes).toEqual(['/api/masterdata/subjects/128', '/api/masterdata/contracts/62']);
  });

  it('ngừng cung cấp dịch vụ gửi ngày kết thúc', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/areas': () => jsonResponse(200, areas),
      'GET /api/masterdata/subjects': () => jsonResponse(200, { items: [subject], total: 1, page: 0, size: 20 }),
      'POST /api/masterdata/subjects/128/end': () => jsonResponse(200, { ...subject, status: 'ENDED' }),
    });
    renderApp('/commune/subjects');

    await userEvent.click(await screen.findByRole('button', { name: 'DTH-H000128' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Ngừng cung cấp dịch vụ' }));
    const modal = (await screen.findAllByRole('dialog')).at(-1)!;
    pickDate(within(modal).getByLabelText('Ngày cuối cùng còn cung cấp'), '30/09/2026');
    await userEvent.click(within(modal).getByRole('button', { name: 'Ngừng cung cấp' }));

    await waitFor(() => {
      const call = fetchFn.mock.calls.find(([url]) => String(url) === '/api/masterdata/subjects/128/end');
      expect(JSON.parse(String((call![1] as RequestInit).body))).toEqual({ endDate: '2026-09-30' });
    });
  });
});
