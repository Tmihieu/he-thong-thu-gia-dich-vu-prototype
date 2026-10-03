import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BULKY_TONES } from '../../features/bulky/BulkyCard';
import { useBulkyRequest, useCancelBulky } from '../../features/citizen/api';
import { PhotoStrip } from '../../features/photos/PhotoStrip';
import { confirmAction } from '../../shared/confirm';
import { errorMessage } from '../../shared/errors';
import { formatDate } from '../../shared/format';
import { BULKY_ITEM_LABELS, BULKY_STATUS_LABELS, DAY_SLOT_LABELS } from '../../shared/labels';
import { colors, spacing, type as t } from '../../shared/theme';
import { Amount, Button, Callout, Card, CardTitle, Divider, ErrorState, Field, InlineError, Line, Loading, Muted, Screen, Tag } from '../../shared/ui';

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
    if (cancel.isPending) return;
    if (!reason.trim()) {
      setReasonError('Nhập lý do hủy.');
      return;
    }
    confirmAction({
      title: 'Hủy yêu cầu thu gom?',
      message: 'Công ty sẽ không đến thu gom nữa. Bạn có thể đăng ký lại sau.',
      confirmLabel: 'Hủy yêu cầu',
      destructive: true,
      onConfirm: () => cancel.mutate(reason.trim()),
    });
  };

  return (
    <Screen refreshing={detail.isFetching && !detail.isPending} onRefresh={() => void detail.refetch()}>
      {detail.isPending ? <Loading /> : null}
      {detail.error ? (
        <ErrorState error={detail.error} fallback="Không tải được yêu cầu." onRetry={() => void detail.refetch()} compact={!!r} />
      ) : null}
      {r ? (
        <>
          {fresh === '1' && r.status === 'PENDING' ? (
            <Callout tone="success" title={`Đã gửi đăng ký ${r.code}`}>
              {r.companyName} sẽ báo phí và ngày hẹn. Bạn nhận thông báo khi có.
            </Callout>
          ) : null}

          <Card>
            <View style={styles.top}>
              <Text accessibilityRole="header" style={styles.title}>
                {r.quantity} × {BULKY_ITEM_LABELS[r.itemType]}
              </Text>
              <Tag tone={BULKY_TONES[r.status]}>{BULKY_STATUS_LABELS[r.status]}</Tag>
            </View>
            {r.itemDescription ? <Text style={styles.text}>{r.itemDescription}</Text> : null}
            <Muted>
              {r.code}, gửi ngày {formatDate(r.createdAt)}
            </Muted>
            {r.photoUrls.length > 0 ? <PhotoStrip urls={r.photoUrls} /> : null}
            <Divider />
            <Line label="Địa chỉ" value={r.address} />
            <Line
              label="Mong muốn"
              value={`${formatDate(r.preferredDate)}${r.preferredSlot ? `, ${DAY_SLOT_LABELS[r.preferredSlot]}` : ''}`}
            />
            <Line label="Công ty thu gom" value={r.companyName} />
          </Card>

          <Card>
            <CardTitle>Phí và lịch hẹn</CardTitle>
            {r.quotedFee !== null ? (
              <>
                <Muted>Phí công ty báo</Muted>
                <Amount value={r.quotedFee} size="title" />
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
              <Field
                label="Lý do hủy"
                error={reasonError}
                value={reason}
                onChangeText={(v) => {
                  setReason(v);
                  setReasonError(null);
                }}
                placeholder="Ví dụ: đã tự mang đi"
                maxLength={255}
              />
              {cancel.error ? <InlineError message={errorMessage(cancel.error, 'Hủy không thành công.')} /> : null}
              <Button title="Hủy yêu cầu" variant="danger" onPress={onCancel} loading={cancel.isPending} />
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...t.heading, color: colors.text, flex: 1 },
  text: { ...t.body, color: colors.text },
});
