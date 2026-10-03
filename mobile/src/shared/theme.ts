/** Bảng màu xanh lá kiểu GRAC của prototype (`--gr-*` trong mobile-preview.css): header xanh đậm, thân nền nhạt, thẻ trắng. */
export const colors = {
  primary: '#127a43', // gr-700
  primaryDark: '#0b4d2c', // gr-900
  primarySoft: '#e3f3ea', // gr-100
  accent: '#2bb673', // gr-500
  chrome: '#0f6236', // gr-800
  heroText: '#d9efe2',
  background: '#f3f5f3', // gr-page
  surface: '#ffffff',
  iconBg: '#eef2ef',
  cardBorder: '#e9eeea',
  text: '#1c2b23', // gr-ink
  textMuted: '#6b7a72', // gr-muted
  border: '#e2e8e4', // gr-line
  badge: '#e0342c',
  danger: '#c0392b',
  dangerSoft: '#fdecea',
  warning: '#8a5a00',
  warningSoft: '#fff6e5',
  info: '#2b6cb0',
  infoSoft: '#e6f0fb',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

/** Bóng nhẹ của thẻ trắng (`0 2px 8px rgba(0,0,0,.04)`). */
export const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;
