import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../features/auth/SessionProvider';
import { BulkyRow } from '../../features/bulky/BulkyCard';
import { summarizeCharges, useBulkyRequests, useCharges, useComplaints, useProfile } from '../../features/citizen/api';
import { ComplaintRow } from '../../features/complaints/ComplaintCard';
import { formatDate } from '../../shared/format';
import { colors, radius, spacing, type as t } from '../../shared/theme';
import { Amount, ErrorState, IconCircle, ListGroup, ListRow, Loading, Muted, Screen, SectionTitle, Tag, type IconName } from '../../shared/ui';

const SERVICES: { label: string; icon: IconName; href: Href }[] = [
  { label: 'Khoản phí của hộ', icon: 'wallet-outline', href: '/charges' },
  { label: 'Lịch thu gom', icon: 'calendar-outline', href: '/schedule' },
  { label: 'Phản ánh, kiến nghị', icon: 'chatbubble-ellipses-outline', href: '/complaints' },
  { label: 'Rác cồng kềnh', icon: 'cube-outline', href: '/bulky' },
  { label: 'Xác nhận thanh toán', icon: 'receipt-outline', href: '/confirmations' },
  { label: 'Chợ đồ cũ', icon: 'storefront-outline', href: '/market' },
];

/** Trang chủ: tiêu điểm là khoản phải đóng + hạn + nút thanh toán; dưới là việc đang xử lý và lối tắt dịch vụ. */
export default function HomeScreen() {
  const { account } = useSession();
  const profile = useProfile();
  const charges = useCharges();
  const complaints = useComplaints();
  const bulky = useBulkyRequests();
  const summary = summarizeCharges(charges.data);

  const latestComplaint = complaints.data?.[0] ?? null;
  const openComplaint = latestComplaint && latestComplaint.status !== 'RESOLVED' ? latestComplaint : null;
  const openBulky = bulky.data?.find((r) => r.status === 'PENDING' || r.status === 'QUOTED') ?? null;
  const subject = profile.data?.subject;
  const company = profile.data?.company;

  const refresh = () => {
    void profile.refetch();
    void charges.refetch();
    void complaints.refetch();
    void bulky.refetch();
  };

  const onPrimary = () =>
    summary.unpaid.length === 1 && summary.next
      ? router.push({ pathname: '/pay/[chargeId]', params: { chargeId: String(summary.next.id) } })
      : router.push('/charges');

  return (
    <Screen refreshing={profile.isFetching || charges.isFetching} onRefresh={refresh}>
      <View style={styles.greeting}>
        <Text style={styles.hello}>Xin chào, {account?.displayName}</Text>
        <Muted>{subject ? `${subject.code}, ${subject.areaName}, ${subject.districtName}` : account?.subjectCode}</Muted>
      </View>

      {charges.isPending ? (
        <Loading label="Đang tải khoản phí…" />
      ) : charges.error && !charges.data ? (
        <ErrorState error={charges.error} fallback="Không tải được khoản phí." onRetry={() => void charges.refetch()} />
      ) : summary.next ? (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Còn phải đóng</Text>
          <Amount value={summary.totalRemaining} size="display" color={colors.onBrand} />
          <View style={styles.dueRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.onBrand} />
            <Text style={styles.dueText}>Hạn đóng {formatDate(summary.next.dueDate)}</Text>
            {summary.overdueCount > 0 ? <Tag tone="danger" icon="alert-circle">Quá hạn</Tag> : null}
          </View>
          <Text style={styles.panelMeta}>
            {summary.unpaid.length > 1
              ? `${summary.unpaid.length} khoản chưa thu, gần nhất: ${summary.next.periodLabel}`
              : `${summary.next.feeTypeName}, ${summary.next.periodLabel}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={summary.unpaid.length === 1 ? 'Thanh toán' : `Xem ${summary.unpaid.length} khoản cần đóng`}
            onPress={onPrimary}
            style={({ pressed }) => [styles.panelButton, pressed && styles.panelButtonPressed]}
          >
            <Text style={styles.panelButtonText}>
              {summary.unpaid.length === 1 ? 'Thanh toán' : `Xem ${summary.unpaid.length} khoản cần đóng`}
            </Text>
            <Ionicons name="arrow-forward" size={22} color={colors.brandDeep} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.panel}>
          <Ionicons name="checkmark-circle" size={36} color={colors.onBrand} />
          <Text style={styles.panelDone}>Hộ không có khoản nào cần đóng</Text>
          <Text style={styles.panelMeta}>Lịch sử các kỳ đã thu xem ở mục Khoản phí của hộ.</Text>
        </View>
      )}

      {openComplaint || openBulky ? (
        <>
          <SectionTitle>Đang xử lý</SectionTitle>
          <ListGroup>
            {openComplaint ? <ComplaintRow c={openComplaint} /> : null}
            {openBulky ? <BulkyRow r={openBulky} /> : null}
          </ListGroup>
        </>
      ) : null}

      <SectionTitle>Dịch vụ</SectionTitle>
      <View style={styles.grid}>
        {SERVICES.map((s) => (
          <Pressable
            key={s.label}
            accessibilityRole="button"
            accessibilityLabel={s.label}
            onPress={() => router.push(s.href)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
          >
            <IconCircle name={s.icon} size={44} />
            <Text style={styles.tileLabel}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {company ? (
        <>
          <SectionTitle>Đơn vị thu gom</SectionTitle>
          <ListGroup>
            <ListRow icon="business-outline" title={company.name} subtitle={`Đầu mối: ${company.contactName}, ${company.contactPhone}`} />
          </ListGroup>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: spacing.xs },
  hello: { ...t.title, color: colors.text },

  // Tiêu điểm của trang: khối xanh đậm duy nhất, số tiền lớn nhất trên màn.
  panel: { backgroundColor: colors.brandDeep, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  panelLabel: { ...t.bodyStrong, color: colors.onBrandDeepMuted },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  dueText: { ...t.bodyStrong, color: colors.onBrand },
  panelMeta: { ...t.secondary, color: colors.onBrandDeepMuted },
  panelDone: { ...t.heading, color: colors.onBrand },
  panelButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  panelButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  panelButtonText: { ...t.button, color: colors.brandDeep },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 112,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    gap: spacing.md,
  },
  tilePressed: { backgroundColor: colors.brandSoft },
  tileLabel: { ...t.bodyStrong, color: colors.text },
});
