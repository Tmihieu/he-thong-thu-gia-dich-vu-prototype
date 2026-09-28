import type { ThemeConfig } from 'antd';

/** Màu lấy theo logo xã Đông Thạnh, trùng `mobile/src/shared/theme.ts`: xanh lá cho hành động, navy cho khung menu. */
export const brand = {
  primary: '#15803d',
  primarySoft: '#e8f5ec',
  chrome: '#1e3a8a',
  chromeDark: '#172e6e',
  background: '#f5f7f5',
  text: '#1f2933',
  textMuted: '#5f6b76',
  border: '#d9e2dc',
} as const;

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: brand.primary,
    colorSuccess: brand.primary,
    colorWarning: '#b7791f',
    colorError: '#c0392b',
    colorInfo: '#2b6cb0',
    colorLink: brand.primary,
    colorText: brand.text,
    colorTextSecondary: brand.textMuted,
    colorBorder: brand.border,
    colorBgLayout: brand.background,
    borderRadius: 8,
    fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Layout: { siderBg: brand.chrome, headerBg: '#ffffff' },
    Menu: {
      darkItemBg: brand.chrome,
      darkSubMenuItemBg: brand.chromeDark,
      darkItemSelectedBg: brand.primary,
      darkItemColor: 'rgba(255,255,255,0.78)',
    },
    Table: { rowSelectedBg: brand.primarySoft },
  },
};
