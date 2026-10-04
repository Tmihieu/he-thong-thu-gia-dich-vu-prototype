import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const collector = { id: 7, username: 'thu07', fullName: 'Lê Văn Thu', role: 'COLLECTOR', companyId: 1 };
const post = {
  id: 5, code: 'CDC-049', caption: 'Thanh lý tivi 32 inch\nChuyển cọc trước 500k', tags: ['SELL'], category: 'ELECTRONICS',
  area: { code: 'KV07', name: 'Tổ 7' }, photoUrls: [], status: 'OPEN', hidden: false, moderation: 'PENDING_REVIEW',
  moderationNote: 'Bị 3 người báo cáo, tạm gỡ chờ cán bộ xã xem lại.', moderatedAt: null, openReports: 3,
  commentCount: 1, author: { citizenId: 9, displayName: 'Chị Lan' }, createdAt: '2026-09-29T02:00:00Z', editedAt: null,
};
const page = (items: unknown[]) => ({ items, total: items.length, page: 0, size: 20, hasMore: false });

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('Chợ cộng đồng (cán bộ xã kiểm duyệt)', () => {
  function api(me: unknown = officer) {
    return mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, me),
      'GET /api/market-moderation/summary': () => jsonResponse(200, { pendingReview: 2, reported: 1 }),
      'GET /api/market-moderation/posts': () => jsonResponse(200, page([post])),
      'GET /api/market-moderation/posts/5': () =>
        jsonResponse(200, {
          post,
          reports: [{ id: 1, reason: 'SCAM', note: 'Đòi cọc trước', reporterName: 'Anh Tư',
            createdAt: '2026-09-29T03:00:00Z', resolution: null, resolvedAt: null }],
          comments: [{ id: 1, content: 'Còn không chị?', authorName: 'Anh Tư', createdAt: '2026-09-29T04:00:00Z' }],
          matchedKeywords: [],
        }),
      'POST /api/market-moderation/posts/5/reject': (_url, init) =>
        jsonResponse(200, { ...post, moderation: 'REJECTED', openReports: 0,
          moderationNote: JSON.parse(String(init.body)).note }),
      'GET /api/market-moderation/keywords': () =>
        jsonResponse(200, [{ id: 1, keyword: 'pháo', createdAt: '2026-09-29T02:00:00Z' }]),
    });
  }

  it('xem bài chờ duyệt, báo cáo, bình luận và gỡ bài phải nhập lý do', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok');
    const fetchMock = api();
    renderApp('/commune/market');

    expect(await screen.findByRole('heading', { name: 'Chợ cộng đồng' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('link', { name: 'CDC-049' }));

    expect(await screen.findByText('Còn không chị?')).toBeInTheDocument();
    expect(screen.getByText('Nghi lừa đảo')).toBeInTheDocument();
    expect(screen.getByText('Đòi cọc trước')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(đăng tin|gửi|bình luận|gọi)/i })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Gỡ bài' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gỡ bài' }));
    expect(await within(dialog).findByText('Nhập lý do gỡ bài')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByRole('textbox'), 'Nghi lừa đảo đặt cọc');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gỡ bài' }));
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([u, i]) => String(u).endsWith('/reject') && i?.method === 'POST')).toBe(true),
    );
  });

  it('tab bộ lọc từ khóa hiện danh sách từ khóa', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok');
    api();
    renderApp('/commune/market?tab=keywords');
    expect(await screen.findByText('pháo')).toBeInTheDocument();
  });

  it('người thu tiền không có chợ cộng đồng', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok');
    api(collector);
    renderApp('/collector/market');
    expect(await screen.findByText('Không tìm thấy trang.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Chợ cộng đồng' })).toBeNull();
  });
});
