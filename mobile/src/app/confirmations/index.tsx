import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useConfirmations } from '../../features/citizen/api';
import { formatDate } from '../../shared/format';
import { PAYMENT_METHOD_LABELS } from '../../shared/labels';
import { colors, spacing } from '../../shared/theme';
import { Amount, Button, EmptyState, ListGroup, ListRow, ListScreen, Tag } from '../../shared/ui';

/** Các lần đã thanh toán của hộ, mọi hình thức (tại nhà, chuyển khoản, app), mới nhất trước. */
export default function ConfirmationsScreen() {
  const list = useConfirmations();

  return (
    <ListScreen
      data={list.data}
      keyOf={(p) => String(p.id)}
      render={(p) => (
        <ListGroup>
          <ListRow
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
        </ListGroup>
      )}
      isPending={list.isPending}
      error={list.error}
      fallbackError="Không tải được danh sách."
      onRetry={() => void list.refetch()}
      refreshing={list.isFetching && !list.isPending}
      onRefresh={() => void list.refetch()}
      empty={<EmptyState icon="receipt-outline" title="Hộ chưa có lần thanh toán nào" message="Sau khi thanh toán hoặc được thu tại nhà, xác nhận sẽ hiện ở đây." action={<Button title="Xem khoản phí của hộ" variant="secondary" fullWidth={false} onPress={() => router.push('/charges')} />} />}
    />
  );
}

const styles = StyleSheet.create({ right: { alignItems: 'flex-end', gap: spacing.xs } });
