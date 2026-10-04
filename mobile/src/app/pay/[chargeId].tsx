import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCharge, usePay } from '../../features/citizen/api';
import { chargeLabel, chargeTone } from '../../features/citizen/chargeStatus';
import { errorMessage } from '../../shared/errors';
import { formatDate, formatMoney } from '../../shared/format';
import { colors, radius, size, spacing, touch, type as t } from '../../shared/theme';
import { Amount, Button, Callout, Caption, Card, Divider, ErrorState, IconCircle, InlineError, Line, ListGroup, Loading, Muted, Screen, SectionTitle, Tag, type IconName } from '../../shared/ui';

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
  // Chặn bấm đúp: `isPending` của mutation bật sau lần bấm đầu một nhịp render.
  const submitting = useRef(false);

  const c = charge.data;
  const payable = c?.status === 'UNPAID' && c.remainingAmount > 0;

  const confirm = () => {
    if (!c || !payable || submitting.current || pay.isPending) return;
    submitting.current = true;
    pay.mutate(c.remainingAmount, {
      onSuccess: (res) => router.replace({ pathname: '/confirmations/[id]', params: { id: String(res.confirmation.id), fresh: '1' } }),
      onSettled: () => {
        submitting.current = false;
      },
    });
  };

  const footer = c ? (
    <>
      {pay.error ? <InlineError message={errorMessage(pay.error, 'Thanh toán không thành công. Vui lòng thử lại.')} /> : null}
      {payable ? (
        <>
          <Button title={`Xác nhận thanh toán ${formatMoney(c.remainingAmount)}`} onPress={confirm} loading={pay.isPending} />
          <Caption style={styles.footCaption}>Thanh toán mô phỏng, không trừ tiền thật.</Caption>
        </>
      ) : (
        <Button title="Quay lại" variant="secondary" onPress={() => router.back()} />
      )}
    </>
  ) : undefined;

  return (
    <Screen footer={footer}>
      {charge.isPending ? <Loading /> : null}
      {charge.error ? <ErrorState error={charge.error} fallback="Không tải được khoản phí." onRetry={() => void charge.refetch()} /> : null}

      {c ? (
        <>
          <Card>
            <View style={styles.top}>
              <Text style={styles.period}>{c.periodLabel}</Text>
              <Tag tone={chargeTone(c)}>{chargeLabel(c)}</Tag>
            </View>
            <Muted>
              {c.feeTypeName}, {c.code}
            </Muted>
            <Text style={styles.amountLabel}>Số tiền thanh toán</Text>
            <Amount value={c.remainingAmount} size="display" />
            <Divider />
            <Line label="Hạn đóng" value={formatDate(c.dueDate)} />
            <Line label="Số tiền khoản" value={formatMoney(c.amount)} />
            {c.paidAmount > 0 ? <Line label="Đã đóng tại nhà" value={formatMoney(c.paidAmount)} /> : null}
          </Card>

          {!payable ? (
            <Callout tone="info" title="Khoản này không cần thanh toán">
              {c.status === 'PAID'
                ? 'Khoản đã được ghi nhận đã đóng đủ. Xem lại ở mục Xác nhận thanh toán.'
                : 'Khoản có trạng thái ' + chargeLabel(c).toLowerCase() + ', không còn số tiền phải đóng.'}
            </Callout>
          ) : (
            <>
              <Callout tone="warning" title="Cổng thanh toán mô phỏng">
                Bản demo không chuyển tiền thật. Khi xác nhận, khoản được ghi là đã đóng và công ty, UBND xã thấy ngay. Ứng dụng phát "Xác nhận thanh toán", không phải biên lai pháp lý.
              </Callout>

              <SectionTitle>Chọn cách thanh toán</SectionTitle>
              <ListGroup>
                {METHODS.map((m) => {
                  const selected = m.key === method;
                  return (
                    <Pressable
                      key={m.key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${m.title}. ${m.subtitle}`}
                      onPress={() => setMethod(m.key)}
                      style={({ pressed }) => [styles.method, selected && styles.methodSelected, pressed && styles.pressed]}
                    >
                      <IconCircle name={m.icon} tone={selected ? 'success' : 'neutral'} />
                      <View style={styles.methodBody}>
                        <Text style={styles.methodTitle}>{m.title}</Text>
                        <Text style={styles.methodSub}>{m.subtitle}</Text>
                      </View>
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected ? <Ionicons name="checkmark" size={16} color={colors.onBrand} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ListGroup>
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  period: { ...t.heading, color: colors.text, flex: 1 },
  amountLabel: { ...t.secondary, color: colors.textSecondary, marginTop: spacing.sm },
  footCaption: { textAlign: 'center' },
  method: { minHeight: touch.row, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  methodSelected: { backgroundColor: colors.brandSoft },
  pressed: { opacity: 0.65 },
  methodBody: { flex: 1, gap: 2 },
  methodTitle: { ...t.bodyStrong, color: colors.text },
  methodSub: { ...t.secondary, color: colors.textSecondary },
  radio: {
    width: size.radio,
    height: size.radio,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
});
