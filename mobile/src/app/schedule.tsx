import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useSchedule } from '../features/citizen/api';
import { formatTimeRange, scheduleDayLabel } from '../features/schedule/format';
import { WASTE_TYPE_LABELS } from '../shared/labels';
import { colors, spacing, type as t } from '../shared/theme';
import { Button, Callout, Card, EmptyState, ErrorState, ListGroup, ListRow, Loading, Muted, Screen, SectionTitle } from '../shared/ui';

/** Lịch thu gom của tổ (T38) như prototype `citizenSchedule`. */
export default function ScheduleScreen() {
  const schedule = useSchedule();
  const s = schedule.data;

  return (
    <Screen refreshing={schedule.isFetching && !schedule.isPending} onRefresh={() => void schedule.refetch()}>
      {schedule.isPending ? <Loading /> : null}
      {schedule.error ? (
        <ErrorState error={schedule.error} fallback="Không tải được lịch thu gom." onRetry={() => void schedule.refetch()} compact={!!s} />
      ) : null}
      {s ? (
        <>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={styles.area}>
              {s.areaName}
            </Text>
            <Muted>{s.districtName}</Muted>
          </View>

          {s.company ? (
            <ListGroup>
              <ListRow icon="business-outline" title={s.company.name} subtitle={`Đầu mối: ${s.company.contactName}, ${s.company.contactPhone}`} />
            </ListGroup>
          ) : (
            <Callout tone="warning">Tổ chưa được phân công công ty thu gom.</Callout>
          )}

          <SectionTitle>Lịch thu gom</SectionTitle>
          {s.lines.length === 0 ? (
            <EmptyState icon="calendar-outline" title="Chưa có lịch thu gom cho tổ này" />
          ) : (
            <Card style={styles.lines}>
              {s.lines.map((line, i) => (
                <View key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <View style={styles.flex}>
                    <Text style={styles.day}>{scheduleDayLabel(line.weekday, line.weekOfMonth)}</Text>
                    <Muted>
                      {WASTE_TYPE_LABELS[line.wasteType]}
                      {line.note ? `, ${line.note}` : ''}
                    </Muted>
                  </View>
                  <Text style={styles.time}>{formatTimeRange(line.startTime, line.endTime)}</Text>
                </View>
              ))}
            </Card>
          )}

          <Button title="Báo thu gom sai lịch" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push('/complaints/new')} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { gap: spacing.xs },
  area: { ...t.title, color: colors.text },
  lines: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  day: { ...t.bodyStrong, color: colors.text },
  time: { ...t.heading, color: colors.brand, fontVariant: ['tabular-nums'] },
});
