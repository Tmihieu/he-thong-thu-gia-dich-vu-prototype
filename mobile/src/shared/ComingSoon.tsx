import { View } from 'react-native';

import { colors, spacing } from './theme';
import { EmptyState } from './ui';

/** Màn giữ chỗ cho chức năng thuộc task sau (như trang "Đang xây dựng" của web, T08). */
export function ComingSoon({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background }}>
      <EmptyState icon="construct-outline" title={title} message="Chức năng này đang được xây dựng trong bản demo." />
    </View>
  );
}
