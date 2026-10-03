/** Nhóm màu của tỷ lệ thu (BR-REM-11); tên khớp bảng màu Ant Design (`token.red`, `token.gold`, ...). */
export type RateBand = 'red' | 'gold' | 'orange' | 'green';

/** < 25% đỏ, 25–< 50% vàng, 50–< 75% cam, ≥ 75% xanh lá. Hàm thuần, dùng chung Đối soát và Dashboard. */
export function rateBand(rate: number): RateBand {
  return rate < 25 ? 'red' : rate < 50 ? 'gold' : rate < 75 ? 'orange' : 'green';
}

/** Tỷ lệ hiển thị tối đa 100% (QĐ-L16). */
export const cappedRate = (rate: number) => Math.min(100, Math.max(0, rate));
