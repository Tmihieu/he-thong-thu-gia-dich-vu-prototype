import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '../../features/auth/SessionProvider';
import { useProfile } from '../../features/citizen/api';
import { initials } from '../../shared/format';
import { colors, radius, spacing } from '../../shared/theme';
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
          />
          <NavRow
            icon={<Ionicons name="receipt-outline" size={20} color={colors.primary} />}
            title="Xác nhận thanh toán"
            subtitle="Các lần đã thanh toán"
            onPress={() => router.push({ pathname: '/coming-soon', params: { title: 'Xác nhận thanh toán' } })}
          />
        </Card>

        <Card>
          <CardTitle>Ứng dụng</CardTitle>
          <NavRow
            icon={<Ionicons name="wifi-outline" size={20} color={colors.primary} />}
            title="Kiểm tra kết nối máy chủ"
            onPress={() => router.push('/connection')}
          />
          <NavRow
            icon={<Ionicons name="information-circle-outline" size={20} color={colors.primary} />}
            title="Bản demo"
            subtitle="Thanh toán chỉ mô phỏng, không phát sinh giao dịch thật"
          />
        </Card>

        <Button title="Đăng xuất" variant="ghost" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, gap: 0 },
  hero: { backgroundColor: colors.primary, alignItems: 'center', gap: spacing.xs, padding: spacing.xl, paddingBottom: spacing.xl + spacing.sm, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  avatar: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: '#ffffff33', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 24 },
  name: { color: '#fff', fontSize: 18, fontWeight: '700' },
  phone: { color: colors.heroText, fontSize: 13 },
  body: { padding: spacing.lg, gap: spacing.md },
});
