import type { TextStyle } from 'react-native';

/**
 * Hệ thiết kế app người dân: nền sáng trung tính, một màu thương hiệu xanh lá đậm cho hành động chính,
 * màu ngữ nghĩa riêng cho trạng thái (không dùng màu thương hiệu để báo lỗi/cảnh báo).
 * Mọi màn chỉ lấy màu, cỡ chữ, khoảng cách, bo góc từ đây — không viết số cứng trong màn.
 * Tương phản: chữ chính/phụ trên nền trắng ≥ 4,5:1; chữ trên nút chính ≥ 7:1.
 */
export const colors = {
  brand: '#0e6b3b',
  brandPressed: '#0a5530',
  brandDeep: '#0a4a29',
  onBrandDeepMuted: '#cfe8d9',
  brandSoft: '#e4f2ea',
  onBrand: '#ffffff',

  background: '#f4f6f3',
  surface: '#ffffff',
  surfaceMuted: '#edf1ee',

  text: '#14211a',
  textSecondary: '#46564c',
  textMuted: '#5b6a61',
  placeholder: '#66756c',

  border: '#c9d3cc',
  borderStrong: '#86958b',
  divider: '#e3e9e5',

  danger: '#b3261e',
  dangerSoft: '#fce8e6',
  warning: '#7a4300',
  warningSoft: '#fff1d6',
  warningBorder: '#e0b45a',
  info: '#1d5694',
  infoSoft: '#e3eefa',
  success: '#0e6b3b',
  successSoft: '#e4f2ea',

  badge: '#d92d20',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Kích thước chạm tối thiểu 44pt; nút chính cao 52. */
export const touch = { min: 44, button: 52, input: 52, row: 60 } as const;

/** Thang chữ: thân 16, phụ 15, chú thích 14; 13 chỉ cho nhãn trạng thái. */
export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  secondary: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  tag: { fontSize: 13, lineHeight: 16, fontWeight: '700' },
  button: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
} satisfies Record<string, TextStyle>;

/** Ngữ nghĩa trạng thái dùng chung cho Tag, Callout, thanh báo. */
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary, border: colors.border },
  success: { bg: colors.successSoft, fg: colors.success, border: '#8cc5a5' },
  warning: { bg: colors.warningSoft, fg: colors.warning, border: colors.warningBorder },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: '#e3a29d' },
  info: { bg: colors.infoSoft, fg: colors.info, border: '#9fbfe3' },
};
