import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '../../features/auth/SessionProvider';
import { useProfile } from '../../features/citizen/api';
import { initials } from '../../shared/format';
import { cardShadow, colors, radius, spacing } from '../../shared/theme';
import { Button, Card, CardTitle, NavRow, Screen } from '../../shared/ui';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { account, signOut } = useSession();
  const profile = useProfile();
  const company = profile.data?.company;

  return (
    <Screen contentStyle={styles.screen} refreshing={profile.isFetching} onRefresh={() => void profile.refetch()}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(account?.displayName)}</Text>
        </View>
        <Text style={styles.name}>{account?.displayName}</Text>
        <Text style={styles.phone}>{account?.phone}</Text>
      </View>

      <View style={styles.body}>
        <Card>
          <CardTitle>Hộ gia đình</CardTitle>
          <NavRow
            icon={<Ionicons name="people-outline" size={20} color={colors.primary} />}
            title={account?.subjectCode ?? ''}
            subtitle={profile.data?.subject.address ?? account?.subjectName}
            onPress={() => router.push('/household')}
          />
          <NavRow
            icon={<Ionicons name="business-outline" size={20} color={colors.primary} />}
            title="Đơn vị thu gom phụ trách"
            subtitle={company ? `${company.name} · ${company.contactPhone}` : 'Khu vực chưa có công ty phụ trách'}
            onPress={() => router.push('/schedule')}
          />
          <NavRow
            icon={<Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />}
            title="Phản ánh, kiến nghị"
            subtitle="Thu chậm, sai mức phí, vấn đề khác"
            onPress={() => router.push('/complaints')}
          />
          <NavRow
            icon={<Ionicons name="receipt-outline" size={20} color={colors.primary} />}
            title="Xác nhận thanh toán"
            subtitle="Các lần đã thanh toán"
            onPress={() => router.push('/confirmations')}
          />
        </Card>


        <Button title="Đăng xuất" variant="ghost" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, gap: 0 },
  // Cùng khung với Trang chủ: hero xanh gr-800, thân nền nhạt bo góc trên trồi lên.
  hero: { backgroundColor: colors.chrome, alignItems: 'center', gap: spacing.xs, padding: spacing.xl, paddingBottom: spacing.xl + radius.lg },
  avatar: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs, ...cardShadow },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 22 },
  name: { color: '#fff', fontSize: 18, fontWeight: '800' },
  phone: { color: colors.heroText, fontSize: 13 },
  body: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, marginTop: -radius.lg, padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
});
