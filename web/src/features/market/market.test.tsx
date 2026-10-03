import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const leader = { id: 3, username: 'lanhdao', fullName: 'Trần Văn Mẫu', role: 'LEADER', companyId: null };
const post = {
  id: 5, code: 'CDC-005', caption: 'Cho lại nôi em bé\nCòn tốt', tags: ['GIVE', 'EXCHANGE'], category: 'CHILDREN',
  area: { code: 'KV07', name: 'Tổ 7' }, photoUrls: [], status: 'OPEN', hidden: false,
  author: { citizenId: 9, displayName: 'Chị Lan' }, createdAt: '2026-09-29T02:00:00Z', editedAt: '2026-09-29T03:00:00Z',
  version: null, commentCount: 1, canComment: false, canCall: false, mine: false, saved: false,
};
const page = (items: unknown[]) => ({ items, total: items.length, page: 0, size: 20, hasMore: false });

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('Chợ cộng đồng (web, chỉ đọc)', () => {
  function api() {
    return mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, leader),
      'GET /api/market/metadata': () =>
        jsonResponse(200, { tags: ['FIND', 'SELL', 'GIVE', 'EXCHANGE'], categories: ['CHILDREN'], areas: [] }),
      'GET /api/market/posts': () => jsonResponse(200, page([post])),
      'GET /api/market/posts/5': () => jsonResponse(200, post),
      'GET /api/market/posts/5/comments': () =>
        jsonResponse(200, page([{ id: 1, content: 'Còn không chị?', author: { citizenId: 8, displayName: 'Anh Tư' },
          mine: false, createdAt: '2026-09-29T04:00:00Z' }])),
    });
  }

  it('lãnh đạo xem danh sách và chi tiết, không có nút ghi hay nhãn giá', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok');
    api();
    renderApp('/leader/market');

    expect(await screen.findByRole('heading', { name: 'Chợ cộng đồng' })).toBeInTheDocument();
    expect(await screen.findByText('Cho tặng')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'CDC-005' }));

    expect(await screen.findByText('Còn không chị?')).toBeInTheDocument();
    expect(screen.getByText('Đồ trẻ em')).toBeInTheDocument();
    expect(screen.getByText(/Đã chỉnh sửa/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(đăng tin|gửi|bình luận|lưu|chặn|gọi)/i })).toBeNull();
    expect(screen.queryByText(/^Giá|\d\s?(đ|₫)$/)).toBeNull();
  });

  it('bài không còn → báo "Bài không còn khả dụng"', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok');
    api();
    renderApp('/leader/market/99');
    expect(await screen.findByText('Bài không còn khả dụng')).toBeInTheDocument();
  });

  it('deep link khi chưa đăng nhập về màn đăng nhập', async () => {
    api();
    const { router } = renderApp('/admin/market/5');
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
