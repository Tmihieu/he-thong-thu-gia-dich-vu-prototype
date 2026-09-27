import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate, formatMoney } from '../../shared/format';
import { BULKY_ITEM_LABELS, BULKY_STATUS_LABELS, type BulkyStatus } from '../../shared/labels';
import { colors, spacing } from '../../shared/theme';
import { Card, Muted, Tag, type Tone } from '../../shared/ui';
import type { BulkyRequest } from '../citizen/api';

export const BULKY_TONES: Record<BulkyStatus, Tone> = {
  PENDING: 'warning',
  QUOTED: 'info',
  COLLECTED: 'success',
  CANCELLED: 'default',
};

/** Ngày hiển thị: ngày hẹn nếu công ty đã báo phí, còn không là ngày hộ mong muốn. */
export function bulkyDateText(r: BulkyRequest): string {
  return r.scheduledDate ? `Hẹn ${formatDate(r.scheduledDate)}` : `Mong muốn ${formatDate(r.preferredDate)}`;
}

/** Thẻ một yêu cầu rác cồng kềnh, như `citizenBulkyStatus` của prototype. */
export function BulkyCard({ r }: { r: BulkyRequest }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/bulky/[id]', params: { id: String(r.id) } })}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card>
        <View style={styles.top}>
          <Text style={styles.title}>
            {r.quantity} × {BULKY_ITEM_LABELS[r.itemType]}
          </Text>
          <Tag tone={BULKY_TONES[r.status]}>{BULKY_STATUS_LABELS[r.status]}</Tag>
        </View>
        <Text style={styles.text}>{bulkyDateText(r)}</Text>
        <Muted>
          {r.code} · Phí: {r.quotedFee !== null ? formatMoney(r.quotedFee) : 'chờ công ty báo'}
        </Muted>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  text: { fontSize: 14, color: colors.text },
});
