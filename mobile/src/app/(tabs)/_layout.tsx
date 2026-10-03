import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useUnreadCount } from '../../features/citizen/api';
import { headerOptions } from '../../shared/headerOptions';
import { colors, spacing, type as t } from '../../shared/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName, focusedName: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? focusedName : name} size={26} color={color} />
  );
}

/** Bốn tab: Trang chủ · Chợ đồ cũ · Thông báo · Tài khoản. Badge = số chưa đọc (poll). Nhãn luôn hiện, chữ 12+ để dễ đọc. */
export default function TabLayout() {
  const unread = useUnreadCount();
  return (
    <Tabs
      screenOptions={{
        ...headerOptions,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          paddingTop: spacing.xs,
        },
        tabBarItemStyle: { minHeight: 48 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ', headerTitle: 'Thu giá VSMT', tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="market" options={{ title: 'Chợ đồ cũ', tabBarIcon: tabIcon('storefront-outline', 'storefront') }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarIcon: tabIcon('notifications-outline', 'notifications'),
          tabBarBadge: unread.data ? unread.data : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.badge, color: colors.onBrand, fontSize: t.tag.fontSize },
        }}
      />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: tabIcon('person-outline', 'person') }} />
    </Tabs>
  );
}
