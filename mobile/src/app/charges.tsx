import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { summarizeCharges, useCharges, type CitizenCharge } from '../features/citizen/api';
import { chargeLabel, chargeTone } from '../features/citizen/chargeStatus';
import { formatDate, formatMoney } from '../shared/format';
import { colors, spacing, type as t } from '../shared/theme';
import { Amount, Button, Callout, Card, Divider, EmptyState, ErrorState, Line, ListGroup, ListRow, Loading, Muted, Screen, SectionTitle, Tag } from '../shared/ui';

/** Một khoản chưa thu: số còn phải đóng và hạn đóng nổi nhất, chi tiết bên dưới, nút thanh toán cuối thẻ. */
function UnpaidCard({ c }: { c: CitizenCharge }) {
  const partial = c.paidAmount > 0;
  return (
    <Card style={c.overdue ? styles.overdue : undefined}>
      <View style={styles.top}>
        <Text style={styles.period}>{c.periodLabel}</Text>
        <Tag tone={chargeTone(c)} icon={c.overdue ? 'alert-circle' : undefined}>
          {chargeLabel(c)}
        </Tag>
      </View>
      <Muted>{c.feeTypeName}</Muted>
      <Amount value={c.remainingAmount} size="display" color={c.overdue ? colors.danger : colors.text} />
      <View style={styles.due}>
        <Ionicons name="calendar-outline" size={20} color={c.overdue ? colors.danger : colors.textSecondary} />
        <Text style={[styles.dueText, c.overdue && styles.dueOverdue]}>Hạn đóng {formatDate(c.dueDate)}</Text>
      </View>
      <Divider />
      <Line label="Số tiền khoản" value={formatMoney(c.amount)} />
      {partial ? <Line label="Đã thu tại nhà" value={formatMoney(c.paidAmount)} /> : null}
      <Line label="Mã khoản" value={c.code} />
      <Button
        title="Thanh toán (mô phỏng)"
        icon="wallet-outline"
        onPress={() => router.push({ pathname: '/pay/[chargeId]', params: { chargeId: String(c.id) } })}
      />
    </Card>
  );
}

function HistoryRow({ c }: { c: CitizenCharge }) {
  const settled = c.status === 'PAID';
  const subtitle = [c.feeTypeName, c.paidAt ? formatDate(c.paidAt, true) : null].filter(Boolean).join(', ');
  return (
    <ListRow
      title={c.periodLabel}
      subtitle={subtitle}
      right={
        <View style={styles.historyRight}>
          <Amount value={c.status === 'EXEMPT' ? 0 : c.amount} size="body" color={settled ? colors.text : colors.textMuted} />
          <Tag tone={chargeTone(c)}>{chargeLabel(c)}</Tag>
        </View>
      }
    />
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
        <ErrorState
          error={charges.error}
          fallback="Không tải được khoản phí."
          onRetry={() => void charges.refetch()}
          compact={!!charges.data}
        />
      ) : null}

      {charges.data ? (
        <>
          <SectionTitle>Cần đóng</SectionTitle>
          {summary.unpaid.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="Hộ không có khoản nào cần đóng" message="Khi có khoản mới, bạn sẽ nhận thông báo trong ứng dụng." />
          ) : (
            <>
              {summary.unpaid.length > 1 ? (
                <Callout tone={summary.overdueCount > 0 ? 'danger' : 'warning'} title={`Tổng còn phải đóng ${formatMoney(summary.totalRemaining)}`}>
                  {summary.overdueCount > 0
                    ? `${summary.unpaid.length} khoản chưa thu, trong đó ${summary.overdueCount} khoản quá hạn.`
                    : `${summary.unpaid.length} khoản chưa thu.`}
                </Callout>
              ) : null}
              {summary.unpaid.map((c) => (
                <UnpaidCard key={c.id} c={c} />
              ))}
            </>
          )}

          <SectionTitle>Lịch sử</SectionTitle>
          {summary.history.length === 0 ? (
            <Muted>Chưa có kỳ nào đã thu.</Muted>
          ) : (
            <ListGroup>
              {summary.history.map((c) => (
                <HistoryRow key={c.id} c={c} />
              ))}
            </ListGroup>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  overdue: { borderColor: colors.danger, borderWidth: 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  period: { ...t.heading, color: colors.text, flex: 1 },
  due: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dueText: { ...t.bodyStrong, color: colors.textSecondary },
  dueOverdue: { color: colors.danger },
  historyRight: { alignItems: 'flex-end', gap: spacing.xs },
});
