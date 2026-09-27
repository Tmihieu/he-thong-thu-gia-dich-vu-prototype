import { Stack, useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '../shared/ComingSoon';

export default function ComingSoonScreen() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  const label = title || 'Đang xây dựng';
  return (
    <>
      <Stack.Screen options={{ title: label }} />
      <ComingSoon title={label} />
    </>
  );
}
