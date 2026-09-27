import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { SessionProvider, useSession } from '../features/auth/SessionProvider';
import { colors } from '../shared/theme';

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SessionProvider>
    </QueryClientProvider>
  );
}

/** Chưa đăng nhập chỉ vào được `login` (và kiểm tra kết nối); đã đăng nhập thì `login` bị ẩn. */
function RootNavigator() {
  const { isLoading, account } = useSession();
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const signedIn = account !== null;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="charges" options={{ title: 'Khoản phí của hộ' }} />
        <Stack.Screen name="household" options={{ title: 'Thông tin hộ' }} />
        <Stack.Screen name="coming-soon" options={{ title: 'Đang xây dựng' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="connection" options={{ title: 'Kiểm tra kết nối' }} />
    </Stack>
  );
}
