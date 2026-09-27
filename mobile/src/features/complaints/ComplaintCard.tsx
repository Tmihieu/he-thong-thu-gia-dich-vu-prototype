import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate } from '../../shared/format';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '../../shared/labels';
import { colors, spacing } from '../../shared/theme';
import { Card, Muted, Tag, type Tone } from '../../shared/ui';
import type { CitizenComplaint } from '../citizen/api';

export function complaintTone(c: Pick<CitizenComplaint, 'status' | 'overdue'>): Tone {
  if (c.status === 'RESOLVED') return 'success';
  if (c.overdue) return 'danger';
  return c.status === 'PROCESSING' ? 'info' : 'warning';
}

export function complaintStatusLabel(c: Pick<CitizenComplaint, 'status' | 'overdue'>): string {
  return c.status !== 'RESOLVED' && c.overdue ? 'Quá hạn xử lý' : COMPLAINT_STATUS_LABELS[c.status];
}

/** Thẻ một phản ánh trong danh sách / trang chủ, như `.gr-card.clickable` của prototype. */
export function ComplaintCard({ c }: { c: CitizenComplaint }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/complaints/[id]', params: { id: String(c.id) } })}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card>
        <View style={styles.top}>
          <Text style={styles.title}>{COMPLAINT_CATEGORY_LABELS[c.category]}</Text>
          <Tag tone={complaintTone(c)}>{complaintStatusLabel(c)}</Tag>
        </View>
        <Text style={styles.summary} numberOfLines={2}>
          {c.summary}
        </Text>
        <Muted>
          {c.code} · {formatDate(c.receivedDate)}
        </Muted>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  summary: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
