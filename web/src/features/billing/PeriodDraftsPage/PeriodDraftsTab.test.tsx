import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const draft = {
  id: 9, code: '2026-11', periodType: 'MONTH', label: 'Tháng 11/2026', startDate: '2026-11-01', endDate: '2026-11-30',
  openDate: '2026-11-01', dueDate: '2026-12-10', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'DRAFT',
  lockedAt: null, note: null,
};
const preview = {
  period: draft,
  dueDate: '2026-11-16',
  result: {
    requestCode: null, chargeCount: 211, exemptCount: 5, totalAmount: 14_394_000, warningCount: 9,
    skipped: [{ subjectId: 300, subjectCode: 'NB-H000461', subjectName: 'Hộ Mẫu', areaCode: 'KV24', reason: 'AREA_WITHOUT_COMPANY',
      warning: true, message: 'Khu vực KV24 chưa có công ty phụ trách.' }],
    skippedByReason: { AREA_WITHOUT_COMPANY: 9 },
  },
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
});
afterEach(() => vi.unstubAllGlobals());

function bodyOf(fetchFn: ReturnType<typeof mockApi>, url: string) {
  const call = fetchFn.mock.calls.find(([u, init]) => String(u) === url && (init as RequestInit | undefined)?.method === 'POST');
  return call ? JSON.parse(String((call[1] as RequestInit).body)) : undefined;
}

describe('Khoản thu · kỳ chờ mở', () => {
  it('liệt kê kỳ dự thảo, xem trước số khoản với hạn hộ đóng mặc định, xác nhận rồi mở kỳ & phát hành', async () => {
    let drafts = [draft];
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods/drafts': () => jsonResponse(200, drafts),
      'GET /api/masterdata/periods': () => jsonResponse(200, []),
      'GET /api/billing/charges': () => jsonResponse(200, { items: [], total: 0, page: 0, size: 50 }),
      'POST /api/billing/periods/9/draft-preview': () => jsonResponse(200, preview),
      'POST /api/billing/periods/9/publish': () => {
        drafts = [];
        return jsonResponse(200, {
          period: { ...draft, status: 'COLLECTING' },
          result: { ...preview.result, requestCode: 'YCT-1126-01' },
        });
      },
    });
    renderApp('/commune/charges?tab=requests');

    expect(await screen.findByText('Tháng 11/2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Xem trước & mở kỳ/ }));

    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('211')).toBeInTheDocument();
    expect(within(drawer).getByText(/14\.394\.000/)).toBeInTheDocument();
    expect(within(drawer).getByText('Tổ chưa có công ty phụ trách: 9 hộ')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Hạn hộ đóng')).toHaveValue('16/11/2026');
    // Chưa chọn ngày thì xem trước theo quy tắc của quản trị.
    expect(bodyOf(fetchFn, '/api/billing/periods/9/draft-preview')).toEqual({});

    await userEvent.click(within(drawer).getByRole('button', { name: /Mở kỳ & phát hành 211 khoản/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mở kỳ & phát hành' }));

    expect(await within(drawer).findByText('Đã mở kỳ Tháng 11/2026')).toBeInTheDocument();
    expect(within(drawer).getByText(/YCT-1126-01/)).toBeInTheDocument();
    expect(bodyOf(fetchFn, '/api/billing/periods/9/publish')).toEqual({ householdDueDate: '2026-11-16' });
  });

  it('chưa có kỳ nào chờ mở thì ẩn mục kỳ chờ mở', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods/drafts': () => jsonResponse(200, []),
      'GET /api/masterdata/periods': () => jsonResponse(200, []),
      'GET /api/masterdata/fee-types': () => jsonResponse(200, []),
      'GET /api/billing/charge-requests': () => jsonResponse(200, []),
      'GET /api/billing/charges': () => jsonResponse(200, { items: [], total: 0, page: 0, size: 50 }),
    });
    renderApp('/commune/charges?tab=requests');

    expect(await screen.findByRole('button', { name: /Lập phiếu YCT/ })).toBeInTheDocument();
    expect(screen.queryByText('Kỳ chờ mở')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xem trước & mở kỳ/ })).not.toBeInTheDocument();
  });

  it('mở kỳ lỗi thì hiện thông báo của máy chủ và kỳ vẫn chờ mở', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/masterdata/periods/drafts': () => jsonResponse(200, [draft]),
      'GET /api/masterdata/periods': () => jsonResponse(200, []),
      'GET /api/billing/charges': () => jsonResponse(200, { items: [], total: 0, page: 0, size: 50 }),
      'POST /api/billing/periods/9/draft-preview': () => jsonResponse(200, preview),
      'POST /api/billing/periods/9/publish': () =>
        jsonResponse(409, { code: 'PERIOD_NOT_DRAFT', message: 'Kỳ 2026-11 không còn ở dạng dự thảo (Đang thu).' }),
    });
    renderApp('/commune/charges?tab=requests');

    await userEvent.click(await screen.findByRole('button', { name: /Xem trước & mở kỳ/ }));
    const drawer = await screen.findByRole('dialog');
    await userEvent.click(await within(drawer).findByRole('button', { name: /Mở kỳ & phát hành 211 khoản/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mở kỳ & phát hành' }));

    expect(await within(drawer).findByText('Kỳ 2026-11 không còn ở dạng dự thảo (Đang thu).')).toBeInTheDocument();
    await waitFor(() => expect(within(drawer).queryByText('Đã mở kỳ Tháng 11/2026')).not.toBeInTheDocument());
  });
});
