/** Màu lấy theo prototype (`prototype/assets/css`, dải --green-*). */
export const colors = {
  primary: '#16794a',
  primaryDark: '#0d633b',
  primarySoft: '#e6f4ec',
  heroText: '#d9efe2',
  background: '#f3faf6',
  surface: '#ffffff',
  text: '#1f2933',
  textMuted: '#5f6b76',
  border: '#d9e2dc',
  danger: '#c0392b',
  dangerSoft: '#fdecea',
  warning: '#b7791f',
  warningSoft: '#fdf3e0',
  info: '#2b6cb0',
  infoSoft: '#e6f0fb',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
