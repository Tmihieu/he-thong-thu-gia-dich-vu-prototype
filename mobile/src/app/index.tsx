import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getApiBaseUrl } from '../api/client';
import { checkConnection } from '../features/connection/checkConnection';
import { colors } from '../shared/theme';

export default function ConnectionCheckScreen() {
  const baseUrl = getApiBaseUrl();
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['connection-check'],
    queryFn: () => checkConnection(),
    retry: false,
    staleTime: 0,
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Địa chỉ máy chủ</Text>
        <Text style={styles.mono}>{baseUrl || '(chưa cấu hình EXPO_PUBLIC_API_URL)'}</Text>
      </View>

      <View style={[styles.card, data && !isFetching && styles.ok, error && !isFetching && styles.fail]}>
        {isFetching ? (
          <View style={styles.row}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.body}>Đang kiểm tra…</Text>
          </View>
        ) : error ? (
          <>
            <Text style={[styles.status, { color: colors.danger }]}>Không kết nối được</Text>
            <Text style={styles.body}>{error.message}</Text>
            <Text style={styles.hint}>
              Kiểm tra: điện thoại và laptop cùng mạng Wi-Fi; backend đang chạy; tường lửa Windows mở cổng 8080.
            </Text>
          </>
        ) : data ? (
          <>
            <Text style={[styles.status, { color: colors.primary }]}>Kết nối thành công</Text>
            <Text style={styles.body}>
              {data.title} · phiên bản {data.version}
            </Text>
            <Text style={styles.body}>
              {data.pathCount} endpoint · phản hồi sau {data.elapsedMs} ms
            </Text>
          </>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isFetching}
        onPress={() => refetch()}
        style={({ pressed }) => [styles.button, (pressed || isFetching) && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Kiểm tra lại</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  ok: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  fail: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, color: colors.textMuted },
  mono: { fontSize: 15, color: colors.text, fontFamily: 'monospace' },
  status: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
