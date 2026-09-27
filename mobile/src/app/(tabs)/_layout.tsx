import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useUnreadCount } from '../../features/citizen/api';
import { colors } from '../../shared/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName, focusedName: IconName) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? focusedName : name} size={size} color={color} />
  );
}

/** Bốn tab như prototype (`CITIZEN_TABS`): Trang chủ · Chợ đồ cũ · Thông báo · Tài khoản. Badge = số chưa đọc (poll). */
export default function TabLayout() {
  const unread = useUnreadCount();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ', headerShown: false, tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen
        name="market"
        options={{ title: 'Chợ đồ cũ', tabBarIcon: tabIcon('storefront-outline', 'storefront') }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarIcon: tabIcon('notifications-outline', 'notifications'),
          tabBarBadge: unread.data ? unread.data : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Tài khoản', headerShown: false, tabBarIcon: tabIcon('person-outline', 'person') }}
      />
    </Tabs>
  );
}
