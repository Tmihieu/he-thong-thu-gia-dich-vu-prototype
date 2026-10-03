import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useConfirmation } from '../../features/citizen/api';
import { formatDate, formatMoney } from '../../shared/format';
import { PAYMENT_METHOD_LABELS } from '../../shared/labels';
import { colors, radius, size, spacing, type as t } from '../../shared/theme';
import { Amount, Button, Card, CardTitle, Divider, ErrorState, Line, Loading, Muted, Screen } from '../../shared/ui';

/** "Xác nhận thanh toán" (O1): mã lấy từ Payment, ổn định; không gọi là biên lai. */
export default function ConfirmationScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const confirmation = useConfirmation(Number(id));
  const p = confirmation.data;
  const isFresh = fresh === '1';

  return (
    <Screen
      footer={isFresh && p ? <Button title="Về trang chủ" onPress={() => router.replace('/')} /> : undefined}
    >
      {confirmation.isPending ? <Loading /> : null}
      {confirmation.error ? (
        <ErrorState error={confirmation.error} fallback="Không tải được xác nhận thanh toán." onRetry={() => void confirmation.refetch()} />
      ) : null}

      {p ? (
        <>
          {isFresh ? (
            <View style={styles.success}>
              <View style={styles.check}>
                <Ionicons name="checkmark" size={36} color={colors.onBrand} />
              </View>
              <Text accessibilityRole="header" style={styles.successTitle}>
                Thanh toán thành công
              </Text>
              <Muted>
                {p.feeTypeName} {p.periodLabel}
              </Muted>
              <Amount value={p.amount} size="display" color={colors.brand} />
            </View>
          ) : null}

          <Card>
            <CardTitle>Xác nhận thanh toán</CardTitle>
            <Line label="Mã xác nhận" value={p.code} bold />
            {!isFresh ? <Line label="Số tiền" value={formatMoney(p.amount)} /> : null}
            <Line label="Thời điểm" value={formatDate(p.paidAt, true)} />
            <Line label="Hình thức" value={PAYMENT_METHOD_LABELS[p.method]} />
            <Divider />
            <Line label="Khoản" value={`${p.feeTypeName}, ${p.periodLabel}`} />
            <Line label="Mã khoản" value={p.chargeCode} />
            <Line label="Trạng thái khoản" value={p.chargeStatus === 'PAID' ? 'Đã đóng đủ' : 'Còn thiếu'} />
          </Card>

          <Card>
            <CardTitle>Hộ nộp</CardTitle>
            <Line label="Hộ" value={`${p.subjectName}, ${p.subjectCode}`} />
            <Line label="Địa chỉ" value={p.subjectAddress} />
            <Line label="Công ty thu gom" value={p.companyName} />
          </Card>

          <Muted>
            Đây là xác nhận của ứng dụng cho khoản đã ghi nhận trên hệ thống, không thay thế chứng từ do đơn vị bán dịch vụ phát hành.
          </Muted>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  check: { width: size.badge, height: size.badge, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  successTitle: { ...t.title, color: colors.text },
});
