import { validateMarketPost } from './validate';

describe('validateMarketPost', () => {
  it('hợp lệ khi có tên, hình thức, mô tả; nơi nhận không bắt buộc', () => {
    expect(validateMarketPost({ title: 'Ghế sofa 3 chỗ', postType: 'GIVE', description: 'Còn chắc', pickupLocation: '' })).toEqual({});
  });

  it('bắt buộc tên vật dụng và hình thức cho tặng / trao đổi (khoảng trắng không tính)', () => {
    const errors = validateMarketPost({ title: '   ', postType: null, description: 'Còn chắc', pickupLocation: '' });
    expect(errors.title).toMatch(/Nhập tên/);
    expect(errors.postType).toMatch(/cho tặng hoặc trao đổi/);
  });

  it('bắt buộc mô tả như backend', () => {
    expect(validateMarketPost({ title: 'Tủ', postType: 'EXCHANGE', description: ' ', pickupLocation: '' }).description).toMatch(/mô tả/);
  });

  it('giới hạn độ dài như backend', () => {
    const errors = validateMarketPost({
      title: 'x'.repeat(151),
      postType: 'GIVE',
      description: 'y'.repeat(2001),
      pickupLocation: 'z'.repeat(256),
    });
    expect(errors.title).toMatch(/150/);
    expect(errors.description).toMatch(/2000/);
    expect(errors.pickupLocation).toMatch(/255/);
  });
});
