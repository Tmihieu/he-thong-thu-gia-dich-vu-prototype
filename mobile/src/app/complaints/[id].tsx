import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useComplaint } from '../../features/citizen/api';
import { complaintStatusLabel, complaintTone } from '../../features/complaints/ComplaintCard';
import { formatDate } from '../../shared/format';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_EVENT_LABELS } from '../../shared/labels';
import { colors, radius, spacing, type as t } from '../../shared/theme';
import { Callout, Card, CardTitle, Divider, ErrorState, Line, Loading, Muted, Screen, Tag } from '../../shared/ui';

/** Chi tiết phản ánh với timeline thật từ `complaint_events`, đồng bộ trạng thái với xã / công ty. */
export default function ComplaintDetailScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const detail = useComplaint(Number(id));
  const d = detail.data;

  return (
    <Screen refreshing={detail.isFetching && !detail.isPending} onRefresh={() => void detail.refetch()}>
      {detail.isPending ? <Loading /> : null}
      {detail.error ? (
        <ErrorState error={detail.error} fallback="Không tải được phản ánh." onRetry={() => void detail.refetch()} compact={!!d} />
      ) : null}
      {d ? (
        <>
          {fresh === '1' ? (
            <Callout tone="success" title={`Đã gửi phản ánh ${d.complaint.code}`}>
              UBND xã đã nhận. Bạn sẽ được báo khi xã chuyển xử lý và khi có kết quả.
            </Callout>
          ) : null}

          <Card>
            <View style={styles.top}>
              <Text accessibilityRole="header" style={styles.title}>
                {COMPLAINT_CATEGORY_LABELS[d.complaint.category]}
              </Text>
              <Tag tone={complaintTone(d.complaint)}>{complaintStatusLabel(d.complaint)}</Tag>
            </View>
            <Muted>
              {d.complaint.code}, gửi ngày {formatDate(d.complaint.receivedDate)}
            </Muted>
            <Text style={styles.content} selectable>
              {d.complaint.content}
            </Text>
            <Divider />
            {d.complaint.location ? <Line label="Địa điểm" value={d.complaint.location} /> : null}
            {d.complaint.forwardedCompanyName ? <Line label="Công ty xử lý" value={d.complaint.forwardedCompanyName} /> : null}
            {d.complaint.deadline ? <Line label="Hạn xử lý" value={formatDate(d.complaint.deadline)} /> : null}
            {d.complaint.resolution ? <Line label="Kết quả" value={d.complaint.resolution} /> : null}
          </Card>

          <Card>
            <CardTitle>Tiến trình xử lý</CardTitle>
            {d.events.map((e, i) => {
              const last = i === d.events.length - 1;
              return (
                <View key={e.id} style={styles.event}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, last && styles.dotLast]}>
                      {last ? <Ionicons name="checkmark" size={14} color={colors.onBrand} /> : null}
                    </View>
                    {!last ? <View style={styles.rule} /> : null}
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{COMPLAINT_EVENT_LABELS[e.eventType]}</Text>
                    <Text style={styles.eventContent}>{e.content}</Text>
                    <Text style={styles.eventMeta}>
                      {e.actorLabel}, {formatDate(e.occurredAt, true)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...t.heading, color: colors.text, flex: 1 },
  content: { ...t.body, color: colors.text },
  event: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 24, alignItems: 'center' },
  dot: { width: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  dotLast: { backgroundColor: colors.brand, borderColor: colors.brand },
  rule: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  eventBody: { flex: 1, gap: spacing.xs, paddingBottom: spacing.lg },
  eventTitle: { ...t.bodyStrong, color: colors.text },
  eventContent: { ...t.secondary, color: colors.text },
  eventMeta: { ...t.caption, color: colors.textMuted },
});
