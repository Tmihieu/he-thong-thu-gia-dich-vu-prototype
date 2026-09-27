import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useComplaint } from '../../features/citizen/api';
import { complaintStatusLabel, complaintTone } from '../../features/complaints/ComplaintCard';
import { formatDate } from '../../shared/format';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_EVENT_LABELS } from '../../shared/labels';
import { colors, radius, spacing } from '../../shared/theme';
import { Card, CardTitle, ErrorBox, Line, Loading, Muted, Screen, Tag } from '../../shared/ui';

/** Chi tiết phản ánh với timeline thật từ `complaint_events`, đồng bộ trạng thái với xã / công ty. */
export default function ComplaintDetailScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const detail = useComplaint(Number(id));
  const d = detail.data;

  return (
    <Screen refreshing={detail.isFetching && !detail.isPending} onRefresh={() => void detail.refetch()}>
      {detail.isPending ? <Loading /> : null}
      {detail.error ? (
        <ErrorBox
          message={detail.error instanceof ApiError ? detail.error.message : 'Không tải được phản ánh.'}
          onRetry={() => void detail.refetch()}
        />
      ) : null}
      {d ? (
        <>
          {fresh === '1' ? (
            <Card style={styles.success}>
              <Text style={styles.successTitle}>Đã gửi phản ánh {d.complaint.code}</Text>
              <Muted>UBND xã đã nhận. Bạn sẽ được báo khi xã chuyển xử lý và khi có kết quả.</Muted>
            </Card>
          ) : null}

          <Card>
            <View style={styles.top}>
              <Text style={styles.title}>{COMPLAINT_CATEGORY_LABELS[d.complaint.category]}</Text>
              <Tag tone={complaintTone(d.complaint)}>{complaintStatusLabel(d.complaint)}</Tag>
            </View>
            <Text style={styles.content}>{d.complaint.content}</Text>
            <Muted>
              {d.complaint.code} · gửi ngày {formatDate(d.complaint.receivedDate)}
              {d.complaint.location ? ` · ${d.complaint.location}` : ''}
            </Muted>
            {d.complaint.forwardedCompanyName ? (
              <Line label="Công ty xử lý" value={d.complaint.forwardedCompanyName} />
            ) : null}
            {d.complaint.deadline ? <Line label="Hạn xử lý" value={formatDate(d.complaint.deadline)} /> : null}
            {d.complaint.resolution ? <Line label="Kết quả" value={d.complaint.resolution} /> : null}
          </Card>

          <Card>
            <CardTitle>Tiến trình xử lý</CardTitle>
            {d.events.map((e, i) => (
              <View key={e.id} style={styles.event}>
                <View style={styles.rail}>
                  <View style={[styles.dot, i === d.events.length - 1 && styles.dotLast]} />
                  {i < d.events.length - 1 ? <View style={styles.rule} /> : null}
                </View>
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>{COMPLAINT_EVENT_LABELS[e.eventType]}</Text>
                  <Text style={styles.eventContent}>{e.content}</Text>
                  <Muted>
                    {e.actorLabel} · {formatDate(e.occurredAt, true)}
                  </Muted>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  successTitle: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  content: { fontSize: 15, color: colors.text, lineHeight: 22 },
  event: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 16, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.border, marginTop: 4 },
  dotLast: { backgroundColor: colors.primary },
  rule: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  eventBody: { flex: 1, gap: 2, paddingBottom: spacing.md },
  eventTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  eventContent: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
