import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useMarkAllRead, useMarkRead, useNotifications, type CitizenNotification, type NotificationKind } from '../../features/citizen/api';
import { notificationHref, type NotificationLink } from '../../features/notifications/links';
import { formatDate } from '../../shared/format';
import { colors, radius, spacing } from '../../shared/theme';
import { Card, Empty, ErrorBox, Loading, Muted, Screen } from '../../shared/ui';

type Segment = 'ALL' | NotificationKind;

/** Như prototype `citizenNotifications`: Tất cả / Phản ánh / Giao dịch. */
const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'COMPLAINT', label: 'Phản ánh' },
  { key: 'TRANSACTION', label: 'Giao dịch' },
];

type IconName = keyof typeof Ionicons.glyphMap;

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

  const open = (n: CitizenNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const href = notificationHref(n.link as NotificationLink | null);
    if (href) router.push(href);
  };

  return (
    <Screen contentStyle={styles.screen} refreshing={list.isFetching && !list.isPending} onRefresh={() => void list.refetch()}>
      <View style={styles.segments}>
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
        <Muted>{list.data ? `${list.data.unreadCount} chưa đọc` : ''}</Muted>
        <Pressable
          accessibilityRole="button"
          disabled={!list.data || list.data.unreadCount === 0 || markAllRead.isPending}
          onPress={() => markAllRead.mutate()}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={[styles.readAll, (!list.data || list.data.unreadCount === 0) && styles.readAllOff]}>
            Đánh dấu tất cả đã đọc
          </Text>
        </Pressable>
      </View>

      {list.isPending ? <Loading /> : null}
      {list.error ? (
        <ErrorBox
          message={list.error instanceof ApiError ? list.error.message : 'Không tải được thông báo.'}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.data?.items.length === 0 ? (
        <Card>
          <Empty>Chưa có thông báo trong mục này.</Empty>
        </Card>
      ) : null}
      {list.data?.items.map((n) => {
        const unread = !n.readAt;
        return (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            onPress={() => open(n)}
            style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && styles.pressed]}
          >
            <View style={[styles.icon, unread && styles.iconUnread]}>
              <Ionicons name={KIND_ICONS[n.kind]} size={20} color={unread ? '#fff' : colors.primary} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, unread && styles.titleUnread]}>{n.title}</Text>
              <Text style={styles.text}>{n.body}</Text>
              <Muted>{formatDate(n.createdAt, true)}</Muted>
            </View>
            {unread ? <View style={styles.dot} /> : null}
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.sm },
  segments: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xs },
  readAll: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  readAllOff: { color: colors.textMuted },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md },
  rowUnread: { borderColor: colors.primary },
  icon: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconUnread: { backgroundColor: colors.primary },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  titleUnread: { fontWeight: '800' },
  text: { fontSize: 14, color: colors.text, lineHeight: 20 },
  dot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.danger, marginTop: 4 },
});
