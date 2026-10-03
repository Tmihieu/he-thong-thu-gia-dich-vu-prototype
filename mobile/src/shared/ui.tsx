import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { Children, Fragment, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOffline } from './connectionState';
import { errorMessage, isNetworkError } from './errors';
import { formatMoney } from './format';
import { colors, radius, spacing, tones, touch, type as t, type Tone } from './theme';

export type { Tone };
export type IconName = keyof typeof Ionicons.glyphMap;

/* ------------------------------------------------------------------ Chữ */

export function Muted({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Caption({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}

export function Body({ children, strong = false, style }: PropsWithChildren<{ strong?: boolean; style?: StyleProp<TextStyle> }>) {
  return <Text style={[strong ? styles.bodyStrong : styles.body, style]}>{children}</Text>;
}

/** Tiêu đề một nhóm nội dung trên màn (đầu mục, không phải nhãn viết hoa). */
export function SectionTitle({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

export function CardTitle({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={styles.cardTitle}>
      {children}
    </Text>
  );
}

/** Số tiền qua format chung, chữ số cùng bề rộng để cột tiền thẳng hàng. */
export function Amount({
  value,
  size = 'heading',
  color = colors.text,
  style,
}: {
  value: number | null | undefined;
  size?: 'display' | 'title' | 'heading' | 'body';
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const base = size === 'display' ? t.display : size === 'title' ? t.title : size === 'heading' ? t.heading : t.bodyStrong;
  return <Text style={[base, styles.tabular, { color }, style]}>{formatMoney(value)}</Text>;
}

/* ------------------------------------------------------------------ Khung màn */

/** Thanh báo mất kết nối: hiện ngay dưới tiêu đề của mọi màn, bấm "Thử lại" tải lại các truy vấn đang mở. */
export function OfflineBar() {
  const offline = useOffline();
  const client = useQueryClient();
  if (!offline) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.offline}>
      <Ionicons name="cloud-offline-outline" size={20} color={colors.warning} />
      <Text style={styles.offlineText}>Không kết nối được máy chủ. Dữ liệu có thể chưa mới.</Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => void client.refetchQueries({ type: 'active' })}
        style={styles.offlineAction}
      >
        <Text style={styles.offlineActionText}>Thử lại</Text>
      </Pressable>
    </View>
  );
}

/**
 * Màn cuộn chuẩn: lề, kéo-để-làm-mới, tránh bàn phím, chừa vùng an toàn dưới. `footer` là thanh hành động cố định
 * ở đáy (nút chính của form / thanh toán) để người dùng không phải cuộn tìm nút.
 */
export function Screen({
  children,
  refreshing = false,
  onRefresh,
  contentStyle,
  footer,
}: PropsWithChildren<{
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <OfflineBar />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.screen, !footer && { paddingBottom: spacing.xxl + insets.bottom }, contentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined
        }
      >
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: spacing.lg + insets.bottom }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

/** Khối nội dung trắng, viền mảnh. Không lồng thẻ trong thẻ: dùng `ListGroup` hoặc `Divider` bên trong. */
export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

/** Nhóm hàng cùng một khung, ngăn bằng đường kẻ mảnh. */
export function ListGroup({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 ? <Divider /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

export function IconCircle({ name, tone = 'success', size = 40 }: { name: IconName; tone?: Tone; size?: number }) {
  const c = tones[tone];
  return (
    <View style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg }]}>
      <Ionicons name={name} size={Math.round(size * 0.52)} color={c.fg} />
    </View>
  );
}

/** Hàng bấm được: biểu tượng, tiêu đề, mô tả, nhãn phải. Cao ≥ 60 để dễ chạm. */
export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'success',
  onPress,
  right,
  unread = false,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: Tone;
  onPress?: () => void;
  right?: ReactNode;
  unread?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && styles.rowPressed]}
    >
      {icon ? <IconCircle name={icon} tone={iconTone} /> : null}
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

/** Dòng "nhãn: giá trị". Giá trị dài tự xuống dòng, không đẩy nhãn. */
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

/* ------------------------------------------------------------------ Trạng thái */

export function Tag({ tone = 'neutral', children, icon }: PropsWithChildren<{ tone?: Tone; icon?: IconName }>) {
  const c = tones[tone];
  return (
    <View style={[styles.tag, { backgroundColor: c.bg, borderColor: c.border }]}>
      {icon ? <Ionicons name={icon} size={14} color={c.fg} /> : null}
      <Text style={[styles.tagText, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

const CALLOUT_ICONS: Record<Tone, IconName> = {
  neutral: 'information-circle-outline',
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  danger: 'alert-circle',
};

/** Ghi chú / cảnh báo / thông báo kết quả: nền nhạt, viền cùng tông, biểu tượng + chữ (không chỉ dựa vào màu). */
export function Callout({
  tone = 'info',
  title,
  children,
  style,
}: PropsWithChildren<{ tone?: Tone; title?: string; style?: StyleProp<ViewStyle> }>) {
  const c = tones[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={[styles.callout, { backgroundColor: c.bg, borderColor: c.border }, style]}
    >
      <Ionicons name={CALLOUT_ICONS[tone]} size={22} color={c.fg} style={styles.calloutIcon} />
      <View style={styles.calloutBody}>
        {title ? <Text style={[styles.calloutTitle, { color: c.fg }]}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={styles.calloutText}>{children}</Text> : children}
      </View>
    </View>
  );
}

/** Lỗi của một thao tác (gửi, hủy, lưu...) ngay trong form. */
export function InlineError({ message }: { message: string }) {
  return <Callout tone="danger">{message}</Callout>;
}

export function Loading({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.center}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <IconCircle name={icon} tone="neutral" size={64} />
      <Text style={styles.stateTitle}>{title}</Text>
      {message ? <Text style={styles.stateText}>{message}</Text> : null}
      {action}
    </View>
  );
}

/**
 * Lỗi tải dữ liệu, có "Thử lại". Mất mạng nói rõ là mất mạng; lỗi khác hiện đúng `message` của backend.
 * `compact`: đã có dữ liệu cũ trên màn, chỉ hiện dải báo gọn phía trên.
 */
export function ErrorState({
  error,
  fallback,
  onRetry,
  compact = false,
}: {
  error: unknown;
  fallback: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const network = isNetworkError(error);
  const title = network ? 'Không có kết nối' : 'Chưa tải được';
  const message = network ? 'Kiểm tra mạng của điện thoại rồi thử lại.' : errorMessage(error, fallback);
  if (compact) {
    return (
      <Callout tone="danger" title={title}>
        <Text style={styles.calloutText}>{message}</Text>
        {onRetry ? <Button title="Thử lại" variant="secondary" compact onPress={onRetry} style={styles.calloutButton} /> : null}
      </Callout>
    );
  }
  return (
    <View style={styles.center}>
      <IconCircle name={network ? 'cloud-offline-outline' : 'alert-circle-outline'} tone={network ? 'warning' : 'danger'} size={64} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? <Button title="Thử lại" variant="secondary" onPress={onRetry} fullWidth={false} style={styles.stateButton} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ Nhập liệu & nút */

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false,
  fullWidth = true,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  const fg =
    variant === 'primary' ? colors.onBrand : variant === 'danger' ? colors.danger : colors.brand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        !fullWidth && styles.buttonAuto,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        variant === 'quiet' && styles.buttonQuiet,
        variant === 'primary' && pressed && styles.buttonPrimaryPressed,
        variant !== 'primary' && pressed && styles.buttonSoftPressed,
        pressed && styles.pressedScale,
        disabled && !loading && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={22} color={fg} /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Ô chọn trong bộ lọc / form. Đang chọn: nền đậm + dấu tích (không chỉ đổi màu). `multi` cho chọn nhiều. */
export function Chip({
  label,
  selected,
  onPress,
  multi = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.rowPressed]}
    >
      {selected ? <Ionicons name="checkmark" size={18} color={colors.onBrand} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Ô nhập có nhãn phía trên (không dùng placeholder làm nhãn), gợi ý, và lỗi ngay dưới ô. */
export function Field({
  label,
  error,
  hint,
  style,
  ...input
}: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.placeholder}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[
          styles.input,
          input.multiline && styles.inputMultiline,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {hint && !error ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.fieldErrorRow}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.fieldError}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Nhóm nhãn + các Chip trong form, có lỗi bên dưới. */
export function ChoiceGroup({
  label,
  error,
  hint,
  children,
}: PropsWithChildren<{ label: string; error?: string | null; hint?: string }>) {
  return (
    <View style={styles.field}>
      <Text accessibilityRole="header" style={styles.fieldLabel}>
        {label}
      </Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <View style={styles.chips}>{children}</View>
      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.fieldErrorRow}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.fieldError}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },

  muted: { ...t.secondary, color: colors.textSecondary },
  caption: { ...t.caption, color: colors.textMuted },
  body: { ...t.body, color: colors.text },
  bodyStrong: { ...t.bodyStrong, color: colors.text },
  sectionTitle: { ...t.heading, color: colors.text, marginTop: spacing.md },
  cardTitle: { ...t.bodyStrong, color: colors.text },

  screen: { padding: spacing.lg, gap: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    gap: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.divider },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
  },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },

  row: {
    minHeight: touch.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowUnread: { backgroundColor: colors.brandSoft },
  rowPressed: { opacity: 0.65 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...t.bodyStrong, color: colors.text },
  rowTitleUnread: { fontWeight: '800' },
  rowSubtitle: { ...t.secondary, color: colors.textSecondary },

  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  lineLabel: { ...t.secondary, color: colors.textSecondary, width: '38%' },
  lineValue: { ...t.body, color: colors.text, flex: 1, textAlign: 'right', fontWeight: '600' },
  lineValueBold: { ...t.heading, color: colors.text, fontVariant: ['tabular-nums'] },
  lineValueSlot: { flex: 1, alignItems: 'flex-end' },

  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  tagText: { ...t.tag },

  callout: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  calloutIcon: { marginTop: 1 },
  calloutBody: { flex: 1, gap: spacing.xs },
  calloutTitle: { ...t.bodyStrong },
  calloutText: { ...t.body, color: colors.text },
  calloutButton: { marginTop: spacing.sm },

  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  stateTitle: { ...t.heading, color: colors.text, textAlign: 'center' },
  stateText: { ...t.body, color: colors.textSecondary, textAlign: 'center' },
  stateButton: { alignSelf: 'center', minWidth: 160 },

  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.warningBorder,
  },
  offlineText: { ...t.caption, color: colors.text, flex: 1 },
  offlineAction: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: spacing.sm },
  offlineActionText: { ...t.bodyStrong, color: colors.warning },

  button: {
    minHeight: touch.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  buttonCompact: { minHeight: touch.min, paddingHorizontal: spacing.lg },
  buttonAuto: { alignSelf: 'auto' },
  buttonPrimary: { backgroundColor: colors.brand },
  buttonPrimaryPressed: { backgroundColor: colors.brandPressed },
  buttonSecondary: { backgroundColor: colors.surface, borderColor: colors.brand },
  buttonDanger: { backgroundColor: colors.surface, borderColor: colors.danger },
  buttonQuiet: { backgroundColor: 'transparent' },
  buttonSoftPressed: { backgroundColor: colors.brandSoft },
  buttonDisabled: { opacity: 0.45 },
  pressedScale: { transform: [{ scale: 0.98 }] },
  buttonText: { ...t.button },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  chipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...t.body, color: colors.text, fontWeight: '600' },
  chipTextSelected: { color: colors.onBrand },

  field: { gap: spacing.sm },
  fieldLabel: { ...t.bodyStrong, color: colors.text },
  fieldHint: { ...t.caption, color: colors.textMuted },
  input: {
    minHeight: touch.input,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...t.body,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputMultiline: { minHeight: 132, textAlignVertical: 'top' },
  inputFocused: { borderColor: colors.brand, borderWidth: 2 },
  inputError: { borderColor: colors.danger, borderWidth: 2 },
  fieldErrorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  fieldError: { ...t.caption, color: colors.danger, flex: 1, fontWeight: '600' },
});
