import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from './theme';

/** Màn giữ chỗ cho chức năng thuộc task sau (như trang "Đang xây dựng" của web, T08). */
export function ComingSoon({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <Ionicons name="construct-outline" size={40} color={colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>Chức năng này đang được xây dựng trong bản demo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  text: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
