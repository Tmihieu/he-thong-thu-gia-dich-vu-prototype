import type { ThemeConfig } from 'antd';

/** Màu và cỡ lấy từ prototype v3.1 (`assets/css/tokens.css`, nhánh `prototype`); biến CSS tương ứng ở `layout/shell.css`. */
export const brand = {
  primary: '#16794a', // --green-700
  primaryDark: '#0d633b', // --green-800
  primarySoft: '#e6f4ec', // --green-100
  chrome: '#0b3a67', // --navy-900
  heading: '#062642', // --navy-950
  background: '#e9eef2', // --page (đậm hơn prototype để thẻ trắng tách khỏi nền)
  text: '#17212b', // --gray-950
  textMuted: '#667085', // --gray-600
  border: '#e2e7ec', // --gray-200
} as const;

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: brand.primary,
    colorSuccess: brand.primary,
    colorWarning: '#9a620d',
    colorError: '#b42318',
    colorInfo: '#175cd3',
    colorLink: '#175cd3',
    colorText: brand.text,
    colorTextHeading: brand.heading,
    colorTextSecondary: brand.textMuted,
    colorBorder: '#d0d7df',
    colorBorderSecondary: brand.border,
    colorBgLayout: brand.background,
    borderRadius: 8,
    borderRadiusLG: 12,
    fontSize: 14,
    fontWeightStrong: 700,
    fontFamily: "'Segoe UI', Arial, sans-serif",
    boxShadowTertiary: '0 1px 3px rgba(6, 38, 66, .08), 0 1px 2px rgba(6, 38, 66, .04)',
  },
  components: {
    Button: { fontWeight: 700, primaryShadow: 'none', defaultShadow: '0 1px 2px rgba(6, 38, 66, .05)' },
    Card: { headerFontSize: 15 },
    Table: {
      headerBg: '#eef3f6',
      headerColor: brand.textMuted,
      headerSplitColor: 'transparent',
      rowHoverBg: '#f3faf6',
      rowSelectedBg: brand.primarySoft,
      borderColor: '#eef1f4',
      cellPaddingBlock: 11,
      cellPaddingInline: 12,
    },
    Tabs: { itemSelectedColor: brand.heading, inkBarColor: brand.primary },
    Typography: { titleMarginBottom: '0.4em' },
    Progress: { defaultColor: brand.primary },
  },
};
