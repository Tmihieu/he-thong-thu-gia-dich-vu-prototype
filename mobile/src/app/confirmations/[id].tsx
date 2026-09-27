import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useConfirmation } from '../../features/citizen/api';
import { formatDate, formatMoney } from '../../shared/format';
import { PAYMENT_METHOD_LABELS } from '../../shared/labels';
import { colors, radius, spacing } from '../../shared/theme';
import { Button, Card, CardTitle, ErrorBox, Line, Loading, Muted, Screen } from '../../shared/ui';

/** "Xác nhận thanh toán" (O1): mã lấy từ Payment, ổn định; không gọi là biên lai. */
export default function ConfirmationScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const confirmation = useConfirmation(Number(id));
  const p = confirmation.data;

  return (
    <Screen>
      {confirmation.isPending ? <Loading /> : null}
      {confirmation.error ? (
        <ErrorBox
          message={confirmation.error instanceof ApiError ? confirmation.error.message : 'Không tải được xác nhận thanh toán.'}
          onRetry={() => void confirmation.refetch()}
        />
      ) : null}

      {p ? (
        <>
          {fresh === '1' ? (
            <Card style={styles.success}>
              <View style={styles.check}>
                <Ionicons name="checkmark" size={28} color="#fff" />
              </View>
              <Text style={styles.successTitle}>Thanh toán thành công</Text>
              <Muted>
                {p.feeTypeName} {p.periodLabel} · {formatMoney(p.amount)}
              </Muted>
            </Card>
          ) : null}

          <Card>
            <CardTitle>Xác nhận thanh toán</CardTitle>
            <Line label="Mã xác nhận" value={p.code} bold />
            <Line label="Số tiền" value={formatMoney(p.amount)} />
            <Line label="Thời điểm" value={formatDate(p.paidAt, true)} />
            <Line label="Hình thức" value={PAYMENT_METHOD_LABELS[p.method]} />
            <Line label="Khoản" value={`${p.feeTypeName} · ${p.periodLabel}`} />
            <Line label="Mã khoản" value={p.chargeCode} />
            <Line label="Trạng thái khoản" value={p.chargeStatus === 'PAID' ? 'Đã đóng đủ' : 'Còn thiếu'} />
          </Card>

          <Card>
            <CardTitle>Hộ nộp</CardTitle>
            <Line label="Hộ" value={`${p.subjectName} · ${p.subjectCode}`} />
            <Line label="Địa chỉ" value={p.subjectAddress} />
            <Line label="Công ty thu gom" value={p.companyName} />
          </Card>

          <Muted>
            Đây là xác nhận của ứng dụng cho khoản đã ghi nhận trên hệ thống, không thay thế chứng từ do đơn vị bán dịch vụ phát hành.
          </Muted>

          {fresh === '1' ? <Button title="Về trang chủ" onPress={() => router.replace('/')} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { alignItems: 'center', gap: spacing.sm, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  check: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
});
