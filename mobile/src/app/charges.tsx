import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/client';
import { summarizeCharges, useCharges, type CitizenCharge } from '../features/citizen/api';
import { formatDate, formatMoney } from '../shared/format';
import { CHARGE_STATUS_LABELS } from '../shared/labels';
import { colors, spacing } from '../shared/theme';
import { Button, Card, Empty, ErrorBox, Line, Loading, Muted, Screen, SectionTitle, Tag, type Tone } from '../shared/ui';

function statusTone(c: CitizenCharge): Tone {
  if (c.status === 'PAID') return 'success';
  if (c.status === 'EXEMPT') return 'info';
  return c.overdue ? 'danger' : 'warning';
}

function statusLabel(c: CitizenCharge): string {
  return c.status === 'UNPAID' && c.overdue ? 'Quá hạn' : CHARGE_STATUS_LABELS[c.status];
}

function UnpaidCard({ c }: { c: CitizenCharge }) {
  const partial = c.paidAmount > 0;
  return (
    <Card style={c.overdue ? styles.overdue : undefined}>
      <View style={styles.top}>
        <Text style={styles.period}>{c.periodLabel}</Text>
        <Tag tone={statusTone(c)}>{statusLabel(c)}</Tag>
      </View>
      <Text style={styles.amount}>{formatMoney(c.remainingAmount)}</Text>
      <Muted>
        {c.feeTypeName} · hạn đóng {formatDate(c.dueDate)}
      </Muted>
      <View style={styles.lines}>
        <Line label="Số tiền khoản" value={formatMoney(c.amount)} />
        {partial ? <Line label="Đã thu tại nhà" value={formatMoney(c.paidAmount)} /> : null}
        <Line label="Còn phải đóng" value={formatMoney(c.remainingAmount)} bold />
        <Line label="Mã khoản" value={c.code} />
      </View>
      <Button
        title="Thanh toán (mô phỏng)"
        onPress={() => router.push({ pathname: '/pay/[chargeId]', params: { chargeId: String(c.id) } })}
      />
    </Card>
  );
}

function HistoryRow({ c }: { c: CitizenCharge }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.flex}>
        <Text style={styles.historyPeriod}>{c.periodLabel}</Text>
        <Muted>
          {c.feeTypeName}
          {c.paidAt ? ` · ${formatDate(c.paidAt, true)}` : ''}
        </Muted>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyAmount}>{formatMoney(c.status === 'EXEMPT' ? 0 : c.amount)}</Text>
        <Tag tone={statusTone(c)}>{statusLabel(c)}</Tag>
      </View>
    </View>
  );
}

/** Khoản phí của hộ: phần cần đóng (hạn gần trước, có nút thanh toán mô phỏng) và lịch sử. */
export default function ChargesScreen() {
  const charges = useCharges();
  const summary = summarizeCharges(charges.data);

  return (
    <Screen refreshing={charges.isFetching && !charges.isPending} onRefresh={() => void charges.refetch()}>
      {charges.isPending ? <Loading /> : null}
      {charges.error ? (
        <ErrorBox
          message={charges.error instanceof ApiError ? charges.error.message : 'Không tải được khoản phí.'}
          onRetry={() => void charges.refetch()}
        />
      ) : null}

      {charges.data ? (
        <>
          <SectionTitle>Cần đóng</SectionTitle>
          {summary.unpaid.length === 0 ? (
            <Card>
              <Empty>Hộ không có khoản nào cần đóng.</Empty>
            </Card>
          ) : (
            summary.unpaid.map((c) => <UnpaidCard key={c.id} c={c} />)
          )}
          {summary.unpaid.length > 1 ? (
            <Card>
              <Line label="Tổng còn phải đóng" value={formatMoney(summary.totalRemaining)} bold />
            </Card>
          ) : null}

          <SectionTitle>Lịch sử</SectionTitle>
          <Card>
            {summary.history.length === 0 ? (
              <Empty>Chưa có kỳ nào đã đóng.</Empty>
            ) : (
              summary.history.map((c) => <HistoryRow key={c.id} c={c} />)
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overdue: { borderColor: colors.danger },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  period: { fontSize: 16, fontWeight: '700', color: colors.text },
  amount: { fontSize: 28, fontWeight: '800', color: colors.primaryDark },
  lines: { marginTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  historyPeriod: { fontSize: 15, fontWeight: '600', color: colors.text },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: 15, fontWeight: '700', color: colors.text },
});
