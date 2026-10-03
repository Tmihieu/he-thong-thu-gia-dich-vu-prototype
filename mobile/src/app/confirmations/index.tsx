import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useConfirmations } from '../../features/citizen/api';
import { formatDate } from '../../shared/format';
import { PAYMENT_METHOD_LABELS } from '../../shared/labels';
import { colors, spacing } from '../../shared/theme';
import { Amount, EmptyState, ErrorState, ListGroup, ListRow, Loading, Screen, Tag } from '../../shared/ui';

/** Các lần đã thanh toán của hộ, mọi hình thức (tại nhà, chuyển khoản, app), mới nhất trước. */
export default function ConfirmationsScreen() {
  const list = useConfirmations();

  return (
    <Screen refreshing={list.isFetching && !list.isPending} onRefresh={() => void list.refetch()}>
      {list.isPending ? <Loading /> : null}
      {list.error ? (
        <ErrorState error={list.error} fallback="Không tải được danh sách." onRetry={() => void list.refetch()} compact={!!list.data} />
      ) : null}
      {list.data?.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Hộ chưa có lần thanh toán nào" message="Sau khi thanh toán hoặc được thu tại nhà, xác nhận sẽ hiện ở đây." />
      ) : null}
      {list.data && list.data.length > 0 ? (
        <ListGroup>
          {list.data.map((p) => (
            <ListRow
              key={p.id}
              icon="receipt-outline"
              title={`${p.feeTypeName}, ${p.periodLabel}`}
              subtitle={`${p.code}, ${formatDate(p.paidAt, true)}`}
              right={
                <View style={styles.right}>
                  <Amount value={p.amount} size="body" color={colors.text} />
                  <Tag tone={p.method === 'APP_SIMULATED' ? 'info' : p.method === 'REFUND' ? 'warning' : 'success'}>
                    {PAYMENT_METHOD_LABELS[p.method]}
                  </Tag>
                </View>
              }
              onPress={() => router.push({ pathname: '/confirmations/[id]', params: { id: String(p.id) } })}
            />
          ))}
        </ListGroup>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ right: { alignItems: 'flex-end', gap: spacing.xs } });
