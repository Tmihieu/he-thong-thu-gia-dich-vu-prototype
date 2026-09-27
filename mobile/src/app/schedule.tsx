import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/client';
import { useSchedule } from '../features/citizen/api';
import { formatTimeRange, scheduleDayLabel } from '../features/schedule/format';
import { WASTE_TYPE_LABELS } from '../shared/labels';
import { colors, spacing } from '../shared/theme';
import { Button, Card, Empty, ErrorBox, Loading, Muted, Screen, Tag } from '../shared/ui';

/** Lịch thu gom của tổ (T38) như prototype `citizenSchedule`. */
export default function ScheduleScreen() {
  const schedule = useSchedule();
  const s = schedule.data;

  return (
    <Screen refreshing={schedule.isFetching && !schedule.isPending} onRefresh={() => void schedule.refetch()}>
      {schedule.isPending ? <Loading /> : null}
      {schedule.error ? (
        <ErrorBox
          message={schedule.error instanceof ApiError ? schedule.error.message : 'Không tải được lịch thu gom.'}
          onRetry={() => void schedule.refetch()}
        />
      ) : null}
      {s ? (
        <>
          <Card>
            <View style={styles.top}>
              <Text style={styles.title}>
                {s.areaName} · {s.districtName}
              </Text>
              <Tag tone="success">Đang áp dụng</Tag>
            </View>
            <Muted>
              {s.company
                ? `${s.company.name} · Đầu mối: ${s.company.contactName} · ${s.company.contactPhone}`
                : 'Tổ chưa được phân công công ty thu gom.'}
            </Muted>
          </Card>

          <Card>
            {s.lines.length === 0 ? (
              <Empty>Chưa có lịch thu gom cho tổ này.</Empty>
            ) : (
              s.lines.map((line, i) => (
                <View key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <View style={styles.flex}>
                    <Text style={styles.day}>{scheduleDayLabel(line.weekday, line.weekOfMonth)}</Text>
                    <Muted>
                      {WASTE_TYPE_LABELS[line.wasteType]}
                      {line.note ? ` · ${line.note}` : ''}
                    </Muted>
                  </View>
                  <Text style={styles.time}>{formatTimeRange(line.startTime, line.endTime)}</Text>
                </View>
              ))
            )}
          </Card>

          <Button
            title="Báo thu gom sai lịch"
            variant="ghost"
            onPress={() => router.push({ pathname: '/coming-soon', params: { title: 'Gửi phản ánh' } })}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  day: { fontSize: 15, fontWeight: '700', color: colors.text },
  time: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
});
