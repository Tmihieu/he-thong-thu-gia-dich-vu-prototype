import { StyleSheet, Text, View } from 'react-native';

import { useProfile } from '../features/citizen/api';
import { formatDate } from '../shared/format';
import { SUBJECT_STATUS_LABELS, SUBJECT_TYPE_LABELS, TARIFF_GROUP_LABELS } from '../shared/labels';
import { colors, spacing, type as t } from '../shared/theme';
import { Callout, Card, CardTitle, ErrorState, Line, Loading, Muted, Screen, Tag } from '../shared/ui';

/** Thông tin hộ như prototype `citizenHousehold`, dữ liệu thật từ `/api/citizen/me`. Hộ không có "hợp đồng": gọi "Đăng ký thu phí" (BR-GEN-08). */
export default function HouseholdScreen() {
  const profile = useProfile();
  const p = profile.data;

  return (
    <Screen refreshing={profile.isFetching && !profile.isPending} onRefresh={() => void profile.refetch()}>
      {profile.isPending ? <Loading /> : null}
      {profile.error ? (
        <ErrorState error={profile.error} fallback="Không tải được thông tin hộ." onRetry={() => void profile.refetch()} compact={!!p} />
      ) : null}
      {p ? (
        <>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={styles.name}>
              {p.subject.name}
            </Text>
            <View style={styles.headMeta}>
              <Muted>{p.subject.code}</Muted>
              <Tag tone={p.subject.status === 'ACTIVE' ? 'success' : p.subject.status === 'PENDING' ? 'warning' : 'neutral'}>
                {SUBJECT_STATUS_LABELS[p.subject.status]}
              </Tag>
            </View>
          </View>

          <Card>
            <CardTitle>Thông tin hộ</CardTitle>
            <Line label="Loại" value={SUBJECT_TYPE_LABELS[p.subject.subjectType]} />
            <Line label="Địa chỉ" value={p.subject.address} />
            <Line label="Tổ, ấp, thôn" value={`${p.subject.areaName} (${p.subject.areaCode}), ${p.subject.districtName}`} />
            {p.subject.memberCount != null ? <Line label="Số nhân khẩu" value={String(p.subject.memberCount)} /> : null}
            <Line label="Điện thoại của hộ" value={p.subject.phone ?? '—'} />
          </Card>

          <Card>
            <CardTitle>Đăng ký thu phí</CardTitle>
            {p.contract ? (
              <>
                <Line label="Số đăng ký" value={p.contract.contractNo} />
                <Line label="Nhóm giá" value={TARIFF_GROUP_LABELS[p.contract.tariffGroup]} />
                <Line label="Hiệu lực từ" value={formatDate(p.contract.validFrom)} />
                {p.contract.validTo ? <Line label="Đến" value={formatDate(p.contract.validTo)} /> : null}
                {p.contract.exempt ? (
                  <Line label="Miễn giảm 100%" value={<Tag tone="info">{p.contract.exemptReason ?? 'Được miễn'}</Tag>} />
                ) : null}
              </>
            ) : (
              <Muted>Hộ chưa có đăng ký thu phí đang hiệu lực. Liên hệ UBND xã để được hướng dẫn.</Muted>
            )}
          </Card>

          <Card>
            <CardTitle>Đơn vị thu gom</CardTitle>
            {p.company ? (
              <>
                <Line label="Công ty" value={p.company.name} />
                <Line label="Đầu mối" value={p.company.contactName} />
                <Line label="Điện thoại" value={p.company.contactPhone} />
              </>
            ) : (
              <Muted>Khu vực của hộ chưa được phân công công ty thu gom.</Muted>
            )}
          </Card>

          <Card>
            <CardTitle>Tài khoản ứng dụng</CardTitle>
            <Line label="Tên hiển thị" value={p.displayName} />
            <Line label="Số điện thoại đăng nhập" value={p.phone} />
          </Card>

          <Callout tone="info">Thông tin chưa đúng? Liên hệ UBND xã, cán bộ xã sẽ xác minh trước khi thay đổi.</Callout>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.sm },
  headMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { ...t.title, color: colors.text },
});
