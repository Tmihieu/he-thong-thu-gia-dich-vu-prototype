import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../features/auth/SessionProvider';
import { useProfile } from '../../features/citizen/api';
import { confirmAction } from '../../shared/confirm';
import { initials } from '../../shared/format';
import { colors, radius, size, spacing, type as t } from '../../shared/theme';
import { Button, ListGroup, ListRow, Muted, Screen, SectionTitle } from '../../shared/ui';

export default function AccountScreen() {
  const { account, signOut } = useSession();
  const profile = useProfile();
  const company = profile.data?.company;

  const onSignOut = () =>
    confirmAction({
      title: 'Đăng xuất?',
      message: 'Bạn cần nhập lại số điện thoại và mã OTP để vào lại ứng dụng.',
      confirmLabel: 'Đăng xuất',
      destructive: true,
      onConfirm: () => void signOut(),
    });

  return (
    <Screen refreshing={profile.isFetching && !profile.isPending} onRefresh={() => void profile.refetch()}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(account?.displayName)}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>{account?.displayName}</Text>
          <Muted>{account?.phone}</Muted>
        </View>
      </View>

      <SectionTitle>Hộ của tôi</SectionTitle>
      <ListGroup>
        <ListRow
          icon="people-outline"
          title={account?.subjectCode ?? 'Thông tin hộ'}
          subtitle={profile.data?.subject.address ?? account?.subjectName}
          onPress={() => router.push('/household')}
        />
        <ListRow
          icon="business-outline"
          title="Đơn vị thu gom"
          subtitle={company ? `${company.name}, ${company.contactPhone}` : 'Khu vực chưa có công ty phụ trách'}
          onPress={() => router.push('/schedule')}
        />
      </ListGroup>

      <SectionTitle>Của tôi trên ứng dụng</SectionTitle>
      <ListGroup>
        <ListRow icon="receipt-outline" title="Xác nhận thanh toán" subtitle="Các lần đã thanh toán" onPress={() => router.push('/confirmations')} />
        <ListRow icon="chatbubble-ellipses-outline" title="Phản ánh, kiến nghị" subtitle="Thu chậm, sai mức phí, vấn đề khác" onPress={() => router.push('/complaints')} />
        <ListRow icon="cube-outline" title="Rác cồng kềnh" subtitle="Đăng ký thu gom đồ lớn" onPress={() => router.push('/bulky')} />
      </ListGroup>

      <SectionTitle>Ứng dụng</SectionTitle>
      <ListGroup>
        <ListRow icon="wifi-outline" title="Kiểm tra kết nối máy chủ" onPress={() => router.push('/connection')} />
      </ListGroup>

      <Button title="Đăng xuất" variant="secondary" icon="log-out-outline" onPress={onSignOut} style={styles.signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...t.title, color: colors.onBrand },
  identityText: { flex: 1, gap: spacing.xs },
  name: { ...t.title, color: colors.text },
  signOut: { marginTop: spacing.lg },
});
