import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { useUnreadCount } from '../../features/citizen/api';
import { colors } from '../../shared/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName, focusedName: IconName) {
  // Icon trong vòng tròn 30px, tab đang chọn tô nền gr-100 (`.phone-tab-item.active` của prototype).
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.primarySoft : 'transparent',
      }}
    >
      <Ionicons name={focused ? focusedName : name} size={20} color={color} />
    </View>
  );
}

/** Bốn tab như prototype (`CITIZEN_TABS`): Trang chủ · Chợ đồ cũ · Thông báo · Tài khoản. Badge = số chưa đọc (poll). */
export default function TabLayout() {
  const unread = useUnreadCount();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.chrome },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#5d6b63',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface, paddingTop: 4 },
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
          tabBarBadgeStyle: { backgroundColor: colors.badge, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Tài khoản', headerShown: false, tabBarIcon: tabIcon('person-outline', 'person') }}
      />
    </Tabs>
  );
}
