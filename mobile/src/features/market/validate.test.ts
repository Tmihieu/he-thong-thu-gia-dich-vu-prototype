import { validateMarketPost } from './validate';

const ok = { caption: 'Cho tủ lạnh cũ', tags: ['GIVE' as const], sharePhone: false, contactPhone: '' };

describe('validateMarketPost', () => {
  it('hợp lệ khi có caption và 1 nhãn; tắt chia sẻ thì bỏ qua SĐT', () => {
    expect(validateMarketPost(ok)).toEqual({});
  });

  it('caption bắt buộc (khoảng trắng không tính) và tối đa 2500', () => {
    expect(validateMarketPost({ ...ok, caption: '   ' }).caption).toMatch(/Nhập nội dung/);
    expect(validateMarketPost({ ...ok, caption: 'x'.repeat(2500) })).toEqual({});
    expect(validateMarketPost({ ...ok, caption: 'x'.repeat(2501) }).caption).toMatch(/2500/);
  });

  it('nhãn 1–4', () => {
    expect(validateMarketPost({ ...ok, tags: [] }).tags).toMatch(/ít nhất/);
    expect(validateMarketPost({ ...ok, tags: ['FIND', 'SELL', 'GIVE', 'EXCHANGE'] })).toEqual({});
  });

  it('bật chia sẻ thì SĐT phải hợp lệ', () => {
    expect(validateMarketPost({ ...ok, sharePhone: true, contactPhone: '' }).contactPhone).toBeTruthy();
    expect(validateMarketPost({ ...ok, sharePhone: true, contactPhone: '12ab' }).contactPhone).toBeTruthy();
    expect(validateMarketPost({ ...ok, sharePhone: true, contactPhone: '+84 902 000 128' })).toEqual({});
  });
});
