import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';
import { notificationPath } from './links';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };

function note(id: number, title: string, extra: Record<string, unknown> = {}) {
  return { id, kind: 'RECEIPT', title, body: 'Nội dung ' + id, link: { screen: 'remittance.receiptIssues', params: { issueId: id } },
    createdAt: '2026-10-16T02:00:00Z', readAt: null, ...extra };
}

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
});
afterEach(() => vi.unstubAllGlobals());

describe('notificationPath', () => {
  it('ánh xạ màn theo vai trò; màn lạ hoặc của vai trò khác thì không đi', () => {
    expect(notificationPath('COMMUNE_OFFICER', { screen: 'remittance.receiptIssues', params: { issueId: 5 } }))
      .toBe('/commune/charges?tab=receipt-issues');
    expect(notificationPath('COMPANY_MANAGER', { screen: 'company.complaints', params: { complaintId: 40 } }))
      .toBe('/company/complaints?id=40');
    expect(notificationPath('COMPANY_MANAGER', { screen: 'company.receipts' })).toBe('/company/assigned?tab=receipts');
    expect(notificationPath('COMMUNE_OFFICER', { screen: 'company.receipts' })).toBeNull();
    expect(notificationPath('COMMUNE_OFFICER', { screen: 'khong.co' })).toBeNull();
    expect(notificationPath('COMMUNE_OFFICER', null)).toBeNull();
  });
});

describe('Chuông thông báo', () => {
  it('không có thông báo thì không hiện số và dropdown báo rỗng', async () => {
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/notifications/unread-count': () => jsonResponse(200, { unreadCount: 0 }),
      'GET /api/notifications': () => jsonResponse(200, { items: [], total: 0, unreadCount: 0 }),
    });
    renderApp('/commune/notifications');

    const bell = await screen.findByRole('button', { name: 'Thông báo' });
    await userEvent.click(bell);
    expect(await screen.findByText('Chưa có thông báo')).toBeInTheDocument();
  });

  it('hiện số chưa đọc; bấm thông báo thì đánh dấu đã đọc và đi đúng màn', async () => {
    let unread = 2;
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/notifications/unread-count': () => jsonResponse(200, { unreadCount: unread }),
      'GET /api/notifications': () =>
        jsonResponse(200, { items: [note(1, 'DV01 báo sai sót phiếu thu PT-CT-1026-001'), note(2, 'Khác')], total: 2, unreadCount: unread }),
      'POST /api/notifications/1/read': () => {
        unread = 1;
        return jsonResponse(200, { ...note(1, 'x'), readAt: '2026-10-16T03:00:00Z' });
      },
      'GET /api/billing/charge-requests': () => jsonResponse(200, []),
      'GET /api/remittance/receipt-issues': () => jsonResponse(200, []),
    });
    const { router } = renderApp('/commune/notifications');

    const bell = await screen.findByRole('button', { name: 'Thông báo, 2 chưa đọc' });
    await userEvent.click(bell);
    const popover = (await screen.findByText('Xem tất cả thông báo')).closest('.ant-popover') as HTMLElement;
    await userEvent.click(within(popover).getByText('DV01 báo sai sót phiếu thu PT-CT-1026-001'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/commune/charges'));
    expect(router.state.location.search).toBe('?tab=receipt-issues');
    expect(await screen.findByRole('tab', { name: 'Sai sót phiếu thu', selected: true })).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([url, init]) => String(url) === '/api/notifications/1/read'
      && (init as RequestInit | undefined)?.method === 'POST')).toBe(true);
    expect(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })).toBeInTheDocument();
  });
});

describe('Trung tâm thông báo', () => {
  it('lọc theo loại gửi kind; "Đã đọc" và "Đánh dấu tất cả" gọi API', async () => {
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/notifications/unread-count': () => jsonResponse(200, { unreadCount: 1 }),
      'GET /api/notifications': () => jsonResponse(200, { items: [note(3, 'Phiếu mới')], total: 1, unreadCount: 1 }),
      'POST /api/notifications/3/read': () => jsonResponse(200, { ...note(3, 'Phiếu mới'), readAt: '2026-10-16T03:00:00Z' }),
      'POST /api/notifications/read-all': () => jsonResponse(200, { unreadCount: 0 }),
    });
    renderApp('/commune/notifications');

    const item = await screen.findByRole('listitem', { name: 'Phiếu mới' });
    await userEvent.click(within(item).getByRole('button', { name: 'Đã đọc' }));
    await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }));
    await userEvent.click(screen.getByText('Khiếu nại', { selector: '.ant-segmented-item-label' }));

    await waitFor(() => {
      const urls = fetchFn.mock.calls.map(([url]) => String(url));
      expect(urls).toContain('/api/notifications/3/read');
      expect(urls).toContain('/api/notifications/read-all');
      expect(urls.some((u) => u.startsWith('/api/notifications?') && u.includes('kind=COMPLAINT'))).toBe(true);
    });
  });
});
