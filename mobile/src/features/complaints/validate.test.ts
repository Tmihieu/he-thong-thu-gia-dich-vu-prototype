import { validateComplaint } from './validate';

describe('validateComplaint', () => {
  it('hợp lệ khi có loại và nội dung; địa điểm không bắt buộc', () => {
    expect(validateComplaint({ category: 'LATE_COLLECTION', content: 'Rác tồn 2 ngày', location: '' })).toEqual({});
  });

  it('bắt buộc loại và nội dung (khoảng trắng không tính)', () => {
    const errors = validateComplaint({ category: null, content: '   ', location: '' });
    expect(errors.category).toMatch(/Chọn loại/);
    expect(errors.content).toMatch(/Nhập nội dung/);
  });

  it('giới hạn độ dài như backend', () => {
    const errors = validateComplaint({ category: 'OTHER', content: 'x'.repeat(4001), location: 'y'.repeat(101) });
    expect(errors.content).toMatch(/4000/);
    expect(errors.location).toMatch(/100/);
  });
});
