import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useCharge, usePay } from '../../features/citizen/api';
import { formatDate, formatMoney } from '../../shared/format';
import { colors, radius, spacing } from '../../shared/theme';
import { Button, Card, CardTitle, ErrorBox, Line, Loading, Muted, Screen, Tag } from '../../shared/ui';

type IconName = keyof typeof Ionicons.glyphMap;

/** Các "cổng" chỉ để chọn cho giống thật; tất cả đều mô phỏng, không có giao dịch tiền thật (O1). */
const METHODS: { key: string; title: string; subtitle: string; icon: IconName }[] = [
  { key: 'qr', title: 'Quét QR chuyển khoản', subtitle: 'Vào tài khoản của công ty thu gom', icon: 'qr-code-outline' },
  { key: 'wallet', title: 'Ví điện tử', subtitle: 'MoMo, Viettel Money, ZaloPay', icon: 'wallet-outline' },
  { key: 'bank', title: 'Ngân hàng liên kết', subtitle: 'Thẻ nội địa, Internet Banking', icon: 'card-outline' },
];

export default function PayScreen() {
  const { chargeId } = useLocalSearchParams<{ chargeId: string }>();
  const id = Number(chargeId);
  const charge = useCharge(id);
  const pay = usePay(id);
  const [method, setMethod] = useState(METHODS[0].key);

  const c = charge.data;
  const payable = c?.status === 'UNPAID';

  const confirm = () => {
    if (!c || pay.isPending) return;
    pay.mutate(c.remainingAmount, {
      onSuccess: (res) => router.replace({ pathname: '/confirmations/[id]', params: { id: String(res.confirmation.id), fresh: '1' } }),
    });
  };

  return (
    <Screen>
      {charge.isPending ? <Loading /> : null}
      {charge.error ? (
        <ErrorBox
          message={charge.error instanceof ApiError ? charge.error.message : 'Không tải được khoản phí.'}
          onRetry={() => void charge.refetch()}
        />
      ) : null}

      {c ? (
        <>
          <Card>
            <View style={styles.top}>
              <Text style={styles.period}>{c.periodLabel}</Text>
              <Tag tone={payable ? (c.overdue ? 'danger' : 'warning') : 'success'}>
                {payable ? (c.overdue ? 'Quá hạn' : 'Chưa đóng') : 'Đã đóng'}
              </Tag>
            </View>
            <Text style={styles.amount}>{formatMoney(c.remainingAmount)}</Text>
            <Muted>
              {c.feeTypeName} · hạn đóng {formatDate(c.dueDate)} · {c.code}
            </Muted>
            <View style={styles.lines}>
              <Line label="Số tiền khoản" value={formatMoney(c.amount)} />
              {c.paidAmount > 0 ? <Line label="Đã thu tại nhà" value={formatMoney(c.paidAmount)} /> : null}
              <Line label="Cần thanh toán" value={formatMoney(c.remainingAmount)} bold />
            </View>
          </Card>

          <Card>
            <CardTitle>Phương thức thanh toán</CardTitle>
            {METHODS.map((m) => {
              const selected = m.key === method;
              return (
                <Pressable
                  key={m.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setMethod(m.key)}
                  style={[styles.method, selected && styles.methodSelected]}
                >
                  <Ionicons name={m.icon} size={22} color={colors.primary} />
                  <View style={styles.flex}>
                    <Text style={styles.methodTitle}>{m.title}</Text>
                    <Muted>{m.subtitle}</Muted>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]} />
                </Pressable>
              );
            })}
          </Card>

          <Card style={styles.notice}>
            <Text style={styles.noticeTitle}>Đây là cổng thanh toán mô phỏng</Text>
            <Text style={styles.noticeText}>
              Bản demo không chuyển tiền thật. Bấm xác nhận thì khoản được ghi là đã đóng và công ty, UBND xã thấy ngay.
              Ứng dụng phát "Xác nhận thanh toán", không phải biên lai pháp lý.
            </Text>
          </Card>

          {pay.error ? (
            <ErrorBox message={pay.error instanceof ApiError ? pay.error.message : 'Thanh toán không thành công. Vui lòng thử lại.'} />
          ) : null}

          {payable ? (
            <Button title={`Xác nhận thanh toán ${formatMoney(c.remainingAmount)}`} onPress={confirm} loading={pay.isPending} />
          ) : (
            <Button title="Khoản này đã đóng" onPress={() => router.back()} variant="ghost" />
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  period: { fontSize: 16, fontWeight: '700', color: colors.text },
  amount: { fontSize: 30, fontWeight: '800', color: colors.primaryDark },
  lines: { marginTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  methodSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  methodTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  radio: { width: 18, height: 18, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border },
  radioSelected: { borderColor: colors.primary, borderWidth: 6 },
  notice: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: colors.warning },
  noticeText: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
