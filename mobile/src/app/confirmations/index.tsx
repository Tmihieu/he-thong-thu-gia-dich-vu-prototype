import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useConfirmations } from '../../features/citizen/api';
import { formatDate, formatMoney } from '../../shared/format';
import { PAYMENT_METHOD_LABELS } from '../../shared/labels';
import { colors, spacing } from '../../shared/theme';
import { Card, Empty, ErrorBox, Loading, Muted, Screen, Tag } from '../../shared/ui';

/** Các lần đã thanh toán của hộ, mọi hình thức (tại nhà, chuyển khoản, app), mới nhất trước. */
export default function ConfirmationsScreen() {
  const list = useConfirmations();

  return (
    <Screen refreshing={list.isFetching && !list.isPending} onRefresh={() => void list.refetch()}>
      {list.isPending ? <Loading /> : null}
      {list.error ? (
        <ErrorBox
          message={list.error instanceof ApiError ? list.error.message : 'Không tải được danh sách.'}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.data?.length === 0 ? (
        <Card>
          <Empty>Hộ chưa có lần thanh toán nào.</Empty>
        </Card>
      ) : null}
      {list.data?.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/confirmations/[id]', params: { id: String(p.id) } })}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Card>
            <View style={styles.top}>
              <Text style={styles.title}>
                {p.feeTypeName} · {p.periodLabel}
              </Text>
              <Tag tone={p.method === 'APP_SIMULATED' ? 'info' : 'success'}>{PAYMENT_METHOD_LABELS[p.method]}</Tag>
            </View>
            <Text style={styles.amount}>{formatMoney(p.amount)}</Text>
            <Muted>
              {p.code} · {formatDate(p.paidAt, true)}
            </Muted>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  amount: { fontSize: 20, fontWeight: '800', color: colors.primaryDark },
});
