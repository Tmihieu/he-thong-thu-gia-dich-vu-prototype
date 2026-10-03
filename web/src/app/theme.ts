import type { ThemeConfig } from 'antd';

/**
 * Hệ thiết kế dùng chung cho mọi màn web (xã, quản trị, lãnh đạo, công ty).
 * Màu và cỡ gốc lấy từ prototype v3.1; biến CSS tương ứng ở `layout/shell.css`.
 * Màn mới chỉ dùng token ở đây hoặc biến CSS `--*`, không tự đặt màu / cỡ chữ cứng.
 */
export const brand = {
  primary: '#16794a', // --green-700: nút chính, trạng thái tốt
  primaryDark: '#0d633b', // --green-800
  primarySoft: '#e6f4ec', // --green-100: nền chọn, hover nhẹ
  chrome: '#0b3a67', // --navy-900: thanh trên
  heading: '#062642', // --navy-950: tiêu đề
  background: '#e9eef2', // --page: nền trang, đậm hơn thẻ trắng
  surface: '#ffffff',
  surfaceMuted: '#f7f9fb', // --gray-50: tiêu đề thẻ, hàng chẵn
  text: '#17212b', // --gray-950
  textMuted: '#566170', // --gray-600 đã đậm hơn (đạt 4.5:1 trên nền trắng)
  border: '#e2e7ec', // --gray-200
} as const;

/** Màu ngữ nghĩa: mỗi trạng thái có màu chữ/viền (`fg`) và nền nhạt (`bg`), đều đạt tương phản AA. */
export const semantic = {
  success: { fg: '#0d633b', bg: '#e6f4ec' },
  warning: { fg: '#8a5300', bg: '#fff4e0' },
  danger: { fg: '#b42318', bg: '#fef3f2' },
  info: { fg: '#175cd3', bg: '#eaf1fe' },
  neutral: { fg: '#475467', bg: '#eef1f4' },
} as const;

/** Thang khoảng cách (px), bội của 4. Dùng cho `gap`, `margin`, `padding` thay cho số lẻ. */
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Thang chữ (px): thân 15 cho người lớn tuổi, phụ 13, tiêu đề trang 24. */
export const type = { caption: 13, body: 15, lead: 16, h3: 20, h2: 24, stat: 26 } as const;

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: brand.primary,
    colorSuccess: semantic.success.fg,
    colorWarning: semantic.warning.fg,
    colorError: semantic.danger.fg,
    colorInfo: semantic.info.fg,
    colorLink: semantic.info.fg,
    colorText: brand.text,
    colorTextHeading: brand.heading,
    colorTextSecondary: brand.textMuted,
    colorTextDescription: brand.textMuted,
    colorTextPlaceholder: '#7f8b99',
    colorBorder: '#cdd5de',
    colorBorderSecondary: brand.border,
    colorBgLayout: brand.background,
    colorBgContainer: brand.surface,
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 46,
    borderRadius: 8,
    borderRadiusSM: 6,
    borderRadiusLG: 12,
    fontSize: type.body,
    fontSizeSM: type.caption,
    fontSizeLG: type.lead,
    fontSizeHeading1: 32,
    fontSizeHeading2: type.h2,
    fontSizeHeading3: type.h2,
    fontSizeHeading4: type.h3,
    fontSizeHeading5: type.lead,
    lineHeight: 1.5,
    fontWeightStrong: 700,
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    motionDurationMid: '0.18s',
    boxShadowTertiary: '0 1px 3px rgba(6, 38, 66, .08), 0 1px 2px rgba(6, 38, 66, .04)',
    boxShadow: '0 6px 16px rgba(6, 38, 66, .10), 0 2px 4px rgba(6, 38, 66, .06)',
    boxShadowSecondary: '0 12px 32px rgba(6, 38, 66, .16), 0 4px 8px rgba(6, 38, 66, .08)',
  },
  components: {
    Button: { fontWeight: 600, primaryShadow: 'none', defaultShadow: '0 1px 2px rgba(6, 38, 66, .05)', paddingInline: 18 },
    Card: { headerFontSize: type.lead, headerHeight: 52, bodyPadding: 20 },
    Table: {
      headerBg: '#eef3f6',
      headerColor: '#344054',
      headerSplitColor: 'transparent',
      rowHoverBg: '#f3faf6',
      rowSelectedBg: brand.primarySoft,
      rowSelectedHoverBg: '#d9eee2',
      borderColor: '#eaeef2',
      cellPaddingBlock: 12,
      cellPaddingInline: 14,
      cellPaddingBlockSM: 8,
      cellPaddingInlineSM: 10,
    },
    Tabs: { itemSelectedColor: brand.heading, itemHoverColor: brand.primary, inkBarColor: brand.primary, titleFontSize: type.lead, horizontalItemGutter: 28 },
    Typography: { titleMarginBottom: '0.4em' },
    Progress: { defaultColor: brand.primary },
    Form: { labelColor: '#344054', verticalLabelPadding: '0 0 6px', itemMarginBottom: 20 },
    Modal: { titleFontSize: type.lead },
    Segmented: { itemSelectedBg: brand.surface, itemSelectedColor: brand.primaryDark, trackBg: '#e3e9ee' },
    Statistic: { titleFontSize: type.caption, contentFontSize: type.stat },
    Tag: { defaultBg: semantic.neutral.bg, defaultColor: semantic.neutral.fg },
  },
};

/** Màu theo tỷ lệ thu (BR-REM-11): < 25% đỏ, 25–< 50% vàng, 50–< 75% cam, ≥ 75% xanh lá. */
export function rateColor(rate: number): string {
  return rate < 25 ? '#cf1322' : rate < 50 ? '#d4a017' : rate < 75 ? '#d46b08' : '#2f8f3a';
}
