import { colors, type as t } from './theme';

/** Tiêu đề sáng, chữ đậm, một đường kẻ mảnh bên dưới: dùng chung cho Stack và Tabs để mọi màn đồng bộ. */
export const headerOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: false,
  headerTintColor: colors.brand,
  headerTitleStyle: { fontSize: t.heading.fontSize, fontWeight: '700' as const, color: colors.text },
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: colors.background },
};
