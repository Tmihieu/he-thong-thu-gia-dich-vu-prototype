import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMarkAllRead, useMarkRead, useNotifications, type CitizenNotification, type NotificationKind } from '../../features/citizen/api';
import { notificationHref, type NotificationLink } from '../../features/notifications/links';
import { formatDate } from '../../shared/format';
import { colors, radius, spacing, touch, type as t } from '../../shared/theme';
import { Button, EmptyState, ErrorState, IconCircle, ListGroup, Loading, Muted, Screen, type IconName } from '../../shared/ui';

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
    const href = notificationHref(n.link as NotificationLink | null);
    if (href) router.push(href);
  };

  return (
    <Screen refreshing={list.isFetching && !list.isPending} onRefresh={() => void list.refetch()}>
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

      {list.isPending ? <Loading /> : null}
      {list.error ? (
        <ErrorState error={list.error} fallback="Không tải được thông báo." onRetry={() => void list.refetch()} compact={!!list.data} />
      ) : null}
      {list.data?.items.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title="Chưa có thông báo" message="Thông báo về khoản phí, phản ánh và thu gom sẽ hiện ở đây." />
      ) : null}
      {list.data && list.data.items.length > 0 ? (
        <ListGroup>
          {list.data.items.map((n) => {
            const unread = !n.readAt;
            return (
              <Pressable
                key={n.id}
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
            );
          })}
        </ListGroup>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  dot: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.badge, marginTop: spacing.xs },
});
