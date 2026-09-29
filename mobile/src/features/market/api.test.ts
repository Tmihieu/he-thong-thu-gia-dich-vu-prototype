import { flattenUnique, newUuid } from './api';

it('ghép trang bỏ id trùng, giữ thứ tự', () => {
  const page = (ids: number[]) => ({ items: ids.map((id) => ({ id })), total: 0, page: 0, size: 20, hasMore: true });
  expect(flattenUnique([page([3, 2]), page([2, 1])]).map((x) => x.id)).toEqual([3, 2, 1]);
});

it('newUuid đúng dạng UUID v4', () => {
  expect(newUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
