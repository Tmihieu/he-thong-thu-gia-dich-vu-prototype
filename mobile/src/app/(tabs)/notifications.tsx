import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMarkAllRead, useMarkRead, useNotifications, type CitizenNotification, type NotificationKind } from '../../features/citizen/api';
import { notificationTarget, type NotificationLink } from '../../features/notifications/links';
import { formatDate } from '../../shared/format';
import { colors, radius, size, spacing, touch, type as t } from '../../shared/theme';
import { Button, EmptyState, IconCircle, ListGroup, ListScreen, Muted, type IconName } from '../../shared/ui';

type Segment = 'ALL' | NotificationKind;

/** Như prototype `citizenNotifications`: Tất cả / Phản ánh / Giao dịch. */
const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'COMPLAINT', label: 'Phản ánh' },
  { key: 'TRANSACTION', label: 'Giao dịch' },
];

const KIND_ICONS: Record<NotificationKind, IconName> = {
  COMPLAINT: 'chatbubble-ellipses-outline',
  TRANSACTION: 'wallet-outline',
  REMINDER: 'alarm-outline',
  RECEIPT: 'receipt-outline',
  INFO: 'information-circle-outline',
};

export default function NotificationsTab() {
  const [segment, setSegment] = useState<Segment>('ALL');
  const list = useNotifications(segment === 'ALL' ? undefined : segment);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const unreadCount = list.data?.unreadCount ?? 0;

  const open = (n: CitizenNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const href = notificationTarget({ kind: n.kind, link: n.link as NotificationLink | null });
    if (href) router.push(href);
  };

  const header = (
    <View style={styles.header}>
      <View accessibilityRole="tablist" style={styles.segments}>
        {SEGMENTS.map((s) => {
          const active = s.key === segment;
          return (
            <Pressable
              key={s.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSegment(s.key)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.head}>
        <Muted>{list.data ? (unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã đọc hết') : ''}</Muted>
        {unreadCount > 0 ? (
          <Button
            title="Đánh dấu đã đọc hết"
            variant="quiet"
            compact
            fullWidth={false}
            loading={markAllRead.isPending}
            onPress={() => markAllRead.mutate()}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <ListScreen
      data={list.data?.items}
      keyOf={(n) => String(n.id)}
      header={header}
      render={(n) => {
        const unread = !n.readAt;
        return (
          <ListGroup>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${unread ? 'Chưa đọc. ' : ''}${n.title}. ${n.body}`}
              onPress={() => open(n)}
              style={({ pressed }) => [styles.item, unread && styles.itemUnread, pressed && styles.pressed]}
            >
              <IconCircle name={KIND_ICONS[n.kind]} tone={unread ? 'success' : 'neutral'} />
              <View style={styles.itemBody}>
                <Text style={[styles.itemTitle, unread && styles.itemTitleUnread]}>{n.title}</Text>
                <Text style={styles.itemText}>{n.body}</Text>
                <Text style={styles.itemTime}>{formatDate(n.createdAt, true)}</Text>
              </View>
              {unread ? <View style={styles.dot} /> : null}
            </Pressable>
          </ListGroup>
        );
      }}
      isPending={list.isPending}
      error={list.error}
      fallbackError="Không tải được thông báo."
      onRetry={() => void list.refetch()}
      refreshing={list.isFetching && !list.isPending}
      onRefresh={() => void list.refetch()}
      empty={<EmptyState icon="notifications-off-outline" title="Chưa có thông báo" message="Thông báo về khoản phí, phản ánh và thu gom sẽ hiện ở đây." />}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  segments: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  segment: { flex: 1, minHeight: touch.min, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  segmentText: { ...t.bodyStrong, color: colors.textSecondary },
  segmentTextActive: { color: colors.brand },

  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: touch.min },

  item: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, alignItems: 'flex-start' },
  itemUnread: { backgroundColor: colors.brandSoft },
  pressed: { opacity: 0.65 },
  itemBody: { flex: 1, gap: spacing.xs },
  itemTitle: { ...t.bodyStrong, color: colors.text, fontWeight: '600' },
  itemTitleUnread: { fontWeight: '800' },
  itemText: { ...t.secondary, color: colors.textSecondary },
  itemTime: { ...t.caption, color: colors.textMuted },
  dot: { width: size.dot, height: size.dot, borderRadius: radius.pill, backgroundColor: colors.badge, marginTop: spacing.xs },
});
