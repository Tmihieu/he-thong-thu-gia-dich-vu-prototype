import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../api/client';
import { BULKY_TONES } from '../../features/bulky/BulkyCard';
import { useBulkyRequest, useCancelBulky } from '../../features/citizen/api';
import { PhotoStrip } from '../../features/photos/PhotoStrip';
import { formatDate, formatMoney } from '../../shared/format';
import { BULKY_ITEM_LABELS, BULKY_STATUS_LABELS, DAY_SLOT_LABELS } from '../../shared/labels';
import { colors, radius, spacing } from '../../shared/theme';
import { Button, Card, CardTitle, ErrorBox, Line, Loading, Muted, Screen, Tag } from '../../shared/ui';

/** Chi tiết yêu cầu rác cồng kềnh: trạng thái, phí công ty báo, ngày hẹn; hủy khi chưa thu gom. */
export default function BulkyDetailScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const detail = useBulkyRequest(Number(id));
  const cancel = useCancelBulky(Number(id));
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const r = detail.data;
  const cancellable = r?.status === 'PENDING' || r?.status === 'QUOTED';

  const onCancel = () => {
    if (!reason.trim()) {
      setReasonError('Nhập lý do hủy.');
      return;
    }
    cancel.mutate(reason.trim());
  };

  return (
    <Screen refreshing={detail.isFetching && !detail.isPending} onRefresh={() => void detail.refetch()}>
      {detail.isPending ? <Loading /> : null}
      {detail.error ? (
        <ErrorBox
          message={detail.error instanceof ApiError ? detail.error.message : 'Không tải được yêu cầu.'}
          onRetry={() => void detail.refetch()}
        />
      ) : null}
      {r ? (
        <>
          {fresh === '1' && r.status === 'PENDING' ? (
            <Card style={styles.success}>
              <Text style={styles.successTitle}>Đã gửi đăng ký {r.code}</Text>
              <Muted>{r.companyName} sẽ báo phí và ngày hẹn; bạn nhận thông báo khi có.</Muted>
            </Card>
          ) : null}

          <Card>
            <View style={styles.top}>
              <Text style={styles.title}>
                {r.quantity} × {BULKY_ITEM_LABELS[r.itemType]}
              </Text>
              <Tag tone={BULKY_TONES[r.status]}>{BULKY_STATUS_LABELS[r.status]}</Tag>
            </View>
            {r.itemDescription ? <Text style={styles.text}>{r.itemDescription}</Text> : null}
            <Muted>
              {r.code} · gửi ngày {formatDate(r.createdAt)}
            </Muted>
            <Line label="Địa chỉ" value={r.address} />
            <Line
              label="Mong muốn"
              value={`${formatDate(r.preferredDate)}${r.preferredSlot ? ` · ${DAY_SLOT_LABELS[r.preferredSlot]}` : ''}`}
            />
            <Line label="Công ty thu gom" value={r.companyName} />
            {r.photoUrls.length > 0 ? <PhotoStrip urls={r.photoUrls} /> : null}
          </Card>

          <Card>
            <CardTitle>Phí và lịch hẹn</CardTitle>
            {r.quotedFee !== null ? (
              <>
                <Line label="Phí công ty báo" value={formatMoney(r.quotedFee)} bold />
                {r.scheduledDate ? <Line label="Ngày hẹn thu gom" value={formatDate(r.scheduledDate)} /> : null}
                <Muted>Phí trả trực tiếp cho công ty khi thu gom, không phải khoản phí vệ sinh của xã.</Muted>
              </>
            ) : (
              <Muted>Chờ công ty báo phí.</Muted>
            )}
            {r.collectedAt ? <Line label="Đã thu gom lúc" value={formatDate(r.collectedAt, true)} /> : null}
            {r.cancelReason ? <Line label="Lý do hủy" value={r.cancelReason} /> : null}
          </Card>

          {cancellable ? (
            <Card>
              <CardTitle>Hủy yêu cầu</CardTitle>
              <TextInput
                accessibilityLabel="Lý do hủy"
                style={styles.input}
                value={reason}
                onChangeText={(v) => {
                  setReason(v);
                  setReasonError(null);
                }}
                placeholder="Ví dụ: đã tự mang đi"
                placeholderTextColor={colors.textMuted}
                maxLength={255}
              />
              {reasonError ? <Text style={styles.error}>{reasonError}</Text> : null}
              {cancel.error ? (
                <ErrorBox message={cancel.error instanceof ApiError ? cancel.error.message : 'Hủy không thành công.'} />
              ) : null}
              <Button title="Hủy yêu cầu" variant="danger" onPress={onCancel} loading={cancel.isPending} />
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  successTitle: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  text: { fontSize: 15, color: colors.text, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  error: { color: colors.danger, fontSize: 13 },
});
