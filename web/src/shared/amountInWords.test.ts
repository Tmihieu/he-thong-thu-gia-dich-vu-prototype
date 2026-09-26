import { amountInWords } from './amountInWords';

describe('amountInWords', () => {
  it.each([
    [0, 'Không đồng'],
    [5, 'Năm đồng'],
    [15, 'Mười lăm đồng'],
    [21, 'Hai mươi mốt đồng'],
    [24, 'Hai mươi tư đồng'],
    [25, 'Hai mươi lăm đồng'],
    [101, 'Một trăm linh một đồng'],
    [110, 'Một trăm mười đồng'],
    [1_005_000, 'Một triệu không trăm linh năm nghìn đồng'],
    [21_000_000, 'Hai mươi mốt triệu đồng'],
    [1_266_000, 'Một triệu hai trăm sáu mươi sáu nghìn đồng'],
    [4_200_000, 'Bốn triệu hai trăm nghìn đồng'],
    [1_000_001, 'Một triệu không trăm linh một đồng'],
    [2_000_500_000, 'Hai tỷ năm trăm nghìn đồng'],
    [3_000_000_000_000, 'Ba nghìn tỷ đồng'],
  ])('%d → %s', (n, words) => {
    expect(amountInWords(n)).toBe(words);
  });

  it('số âm hoặc lẻ bị từ chối', () => {
    expect(() => amountInWords(-1)).toThrow(RangeError);
    expect(() => amountInWords(1.5)).toThrow(RangeError);
  });
});
