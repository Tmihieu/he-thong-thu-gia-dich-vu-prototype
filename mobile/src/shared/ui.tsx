import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from './theme';

/** Màn cuộn có lề chuẩn; `onRefresh` bật kéo-để-tải-lại. */
export function Screen({
  children,
  refreshing = false,
  onRefresh,
  contentStyle,
}: PropsWithChildren<{ refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle> }>) {
  return (
    <ScrollView
      contentContainerStyle={[styles.screen, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardTitle({ children }: PropsWithChildren) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** Dòng "nhãn — giá trị" như `.gr-line` của prototype. */
export function Line({ label, value, bold = false }: { label: string; value: ReactNode; bold?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[styles.lineValue, bold && styles.lineValueBold]}>{value}</Text>
      ) : (
        <View style={styles.lineValueSlot}>{value}</View>
      )}
    </View>
  );
}

export type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  default: { bg: '#eef2f0', fg: colors.textMuted },
  success: { bg: colors.primarySoft, fg: colors.primaryDark },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
};

export function Tag({ tone = 'default', children }: PropsWithChildren<{ tone?: Tone }>) {
  const t = TONES[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <Text style={[styles.tagText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        (pressed || off) && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, variant === 'ghost' && styles.buttonTextGhost]}>{title}</Text>
      )}
    </Pressable>
  );
}

/** Ô chọn một trong nhiều (bộ lọc, loại trong form). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Hàng bấm được có tiêu đề, mô tả và mũi tên (như `.gr-row` của prototype). */
export function NavRow({
  title,
  subtitle,
  onPress,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  icon?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
    >
      {icon ? <View style={styles.navIcon}>{icon}</View> : null}
      <View style={styles.navBody}>
        <Text style={styles.navTitle}>{title}</Text>
        {subtitle ? <Text style={styles.navSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </Pressable>
  );
}

export function Loading({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={styles.errorCard}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? <Button title="Thử lại" variant="ghost" onPress={onRetry} style={{ marginTop: spacing.sm }} /> : null}
    </Card>
  );
}

export function Empty({ children }: PropsWithChildren) {
  return (
    <View style={styles.center}>
      <Text style={styles.muted}>{children}</Text>
    </View>
  );
}

export function Muted({ children }: PropsWithChildren) {
  return <Text style={styles.muted}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 4 },
  lineLabel: { fontSize: 14, color: colors.textMuted, flexShrink: 0 },
  lineValue: { fontSize: 15, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  lineValueBold: { fontSize: 17, fontWeight: '800', color: colors.primaryDark },
  lineValueSlot: { flex: 1, alignItems: 'flex-end' },
  tag: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: '700' },
  button: { backgroundColor: colors.primary, borderRadius: radius.sm + 2, paddingVertical: 14, alignItems: 'center' },
  buttonGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  buttonDanger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.75 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonTextGhost: { color: colors.primary },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 13, color: colors.text },
  chipTextSelected: { color: colors.primaryDark, fontWeight: '700' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10 },
  navRowPressed: { opacity: 0.6 },
  navIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBody: { flex: 1, gap: 2 },
  navTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  navSubtitle: { fontSize: 13, color: colors.textMuted },
  chevron: { fontSize: 22, color: colors.textMuted, marginTop: -2 },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  muted: { fontSize: 14, color: colors.textMuted },
  errorCard: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  errorText: { color: colors.danger, fontSize: 15 },
});
