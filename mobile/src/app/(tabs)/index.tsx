import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../../api/client';
import { useSession } from '../../features/auth/SessionProvider';
import { BulkyCard } from '../../features/bulky/BulkyCard';
import { summarizeCharges, useBulkyRequests, useCharges, useComplaints, useProfile } from '../../features/citizen/api';
import { ComplaintCard } from '../../features/complaints/ComplaintCard';
import { formatDate, formatMoney, initials } from '../../shared/format';
import { cardShadow, colors, radius, spacing } from '../../shared/theme';
import { Card, ErrorBox, Screen, SectionTitle, Tag } from '../../shared/ui';

type IconName = keyof typeof Ionicons.glyphMap;

const SHORTCUTS: { label: string; icon: IconName; href: Href }[] = [
  { label: 'Khoản phí\nphải đóng', icon: 'wallet-outline', href: '/charges' },
  { label: 'Gửi phản ánh\nkiến nghị', icon: 'chatbubble-ellipses-outline', href: '/complaints/new' },
  { label: 'Đăng ký\nrác cồng kềnh', icon: 'cube-outline', href: '/bulky' },
  { label: 'Chợ\nđồ cũ', icon: 'storefront-outline', href: '/market' },
  { label: 'Lịch\nthu gom', icon: 'calendar-outline', href: '/schedule' },
  { label: 'Xác nhận\nthanh toán', icon: 'receipt-outline', href: '/confirmations' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
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
  const refreshing = profile.isFetching || charges.isFetching;
  const refresh = () => {
    void profile.refetch();
    void charges.refetch();
    void complaints.refetch();
    void bulky.refetch();
  };

  return (
    <Screen contentStyle={styles.screen} refreshing={refreshing} onRefresh={refresh}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(account?.displayName)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroSmall}>Xin chào</Text>
            <Text style={styles.heroName}>{account?.displayName}</Text>
            <Text style={styles.heroSmall}>
              {subject ? `${subject.code} · ${subject.areaName}, ${subject.districtName}` : account?.subjectCode}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            summary.next
              ? router.push({ pathname: '/pay/[chargeId]', params: { chargeId: String(summary.next.id) } })
              : router.push('/charges')
          }
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Ionicons name="wallet-outline" size={22} color="#fff" />
          <View style={styles.flex}>
            {charges.isPending ? (
              <Text style={styles.ctaText}>Đang tải khoản phí…</Text>
            ) : summary.next ? (
              <>
                <Text style={styles.ctaText}>
                  Phí {summary.next.periodLabel} · <Text style={styles.ctaAmount}>{formatMoney(summary.totalRemaining)}</Text>
                </Text>
                <Text style={styles.ctaSub}>
                  {summary.unpaid.length > 1 ? `${summary.unpaid.length} khoản · ` : ''}hạn {formatDate(summary.next.dueDate)}
                </Text>
              </>
            ) : (
              <Text style={styles.ctaText}>Không có khoản nào cần đóng</Text>
            )}
          </View>
          <Text style={styles.ctaLink}>{summary.next ? 'Thanh toán ›' : 'Xem ›'}</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.grid}>
          {SHORTCUTS.map((s) => (
            <Pressable
              key={s.label}
              accessibilityRole="button"
              onPress={() => router.push(s.href)}
              style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]}
            >
              <View style={styles.circle}>
                <Ionicons name={s.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.gridLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {charges.error ? (
          <ErrorBox
            message={charges.error instanceof ApiError ? charges.error.message : 'Không tải được khoản phí.'}
            onRetry={() => void charges.refetch()}
          />
        ) : null}

        <SectionTitle>Việc của bạn</SectionTitle>
        {summary.overdueCount > 0 ? (
          <Pressable onPress={() => router.push('/charges')}>
            <Card style={styles.overdueCard}>
              <View style={styles.cardTop}>
                <Text style={styles.cardStrong}>Khoản phí quá hạn</Text>
                <Tag tone="danger">{summary.overdueCount} khoản</Tag>
              </View>
              <Text style={styles.cardText}>Vui lòng thanh toán sớm để công ty không phải đến thu tại nhà nhiều lần.</Text>
            </Card>
          </Pressable>
        ) : null}
        {openComplaint ? <ComplaintCard c={openComplaint} /> : null}
        {openBulky ? <BulkyCard r={openBulky} /> : null}
        {summary.overdueCount === 0 && !openComplaint && !openBulky ? (
          <Card>
            <Text style={styles.cardStrong}>Không có việc cần xử lý</Text>
            <Text style={styles.cardText}>Phản ánh đang xử lý và rác cồng kềnh đã đăng ký sẽ hiện ở đây.</Text>
          </Card>
        ) : null}
        <Pressable onPress={() => router.push('/complaints')} accessibilityRole="button">
          <Text style={styles.link}>Xem tất cả phản ánh của bạn ›</Text>
        </Pressable>

        {profile.data?.company ? (
          <>
            <SectionTitle>Đơn vị thu gom</SectionTitle>
            <Card>
              <Text style={styles.cardStrong}>{profile.data.company.name}</Text>
              <Text style={styles.cardText}>
                Đầu mối: {profile.data.company.contactName} · {profile.data.company.contactPhone}
              </Text>
            </Card>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { padding: 0, gap: 0 },
  // Hero xanh gr-800; thân nền nhạt bo góc trên 22px trồi lên đè mép dưới hero (`.gr-hero` + `.gr-body`).
  hero: { backgroundColor: colors.chrome, paddingHorizontal: 18, paddingBottom: spacing.xl + radius.lg, gap: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...cardShadow },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  heroSmall: { color: colors.heroText, fontSize: 12 },
  heroName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.accent, borderRadius: 26, paddingHorizontal: 16, paddingVertical: 10 },
  ctaText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  ctaAmount: { fontWeight: '800', color: '#fff' },
  ctaSub: { fontSize: 12, color: '#eafaf1', marginTop: 2 },
  ctaLink: { color: '#fff', fontWeight: '800' },
  pressed: { opacity: 0.7 },
  body: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, marginTop: -radius.lg, padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.lg },
  gridItem: { width: '31%', alignItems: 'center', gap: spacing.sm },
  circle: { width: 62, height: 62, borderRadius: radius.pill, backgroundColor: colors.iconBg, borderWidth: 1, borderColor: '#e6ebe7', alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center', lineHeight: 16 },
  overdueCard: { borderColor: colors.danger },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardStrong: { fontSize: 14, fontWeight: '800', color: colors.text },
  cardText: { fontSize: 13, color: '#3f4d46', lineHeight: 19 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14, paddingVertical: spacing.xs },
});
