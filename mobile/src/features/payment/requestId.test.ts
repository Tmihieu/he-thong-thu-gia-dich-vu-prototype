import { completeRequest, newRequestId, requestIdFor, resetRequestIds } from './requestId';

beforeEach(resetRequestIds);

describe('requestIdFor', () => {
  it('giữ nguyên mã cho cùng khoản tới khi hoàn tất, mỗi khoản một mã', () => {
    const first = requestIdFor(7);
    expect(requestIdFor(7)).toBe(first);
    expect(requestIdFor(8)).not.toBe(first);

    completeRequest(7);
    expect(requestIdFor(7)).not.toBe(first);
  });

  it('mã hợp lệ với backend: không quá 40 ký tự, không khoảng trắng', () => {
    for (let i = 0; i < 50; i++) {
      const id = newRequestId();
      expect(id.length).toBeLessThanOrEqual(40);
      expect(id).toMatch(/^app-[a-z0-9-]+$/);
    }
  });

  it('hai mã sinh liên tiếp khác nhau', () => {
    expect(newRequestId(() => 1)).not.toBe(newRequestId(() => 1));
  });
});
