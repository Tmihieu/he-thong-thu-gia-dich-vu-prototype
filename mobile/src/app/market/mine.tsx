import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { flattenUnique, useMyPosts, type MineFilter } from '../../features/market/api';
import { PagedList, PostCard } from '../../features/market/PostCard';
import { spacing } from '../../shared/theme';
import { Chip } from '../../shared/ui';

const FILTERS: { f: MineFilter; label: string }[] = [
  { f: 'OPEN', label: 'Đang đăng' },
  { f: 'CLOSED', label: 'Đã xong' },
  { f: 'HIDDEN', label: 'Đã ẩn' },
];

/** Tin của tôi (spec §5.4): Đang đăng / Đã xong (không ẩn) và Đã ẩn (cả OPEN lẫn CLOSED). */
export default function MyPostsScreen() {
  const [f, setF] = useState<MineFilter>('OPEN');
  const q = useMyPosts(f);
  return (
    <PagedList
      q={q}
      items={flattenUnique(q.data?.pages)}
      keyOf={(p) => String(p.id)}
      render={(p) => <PostCard p={p} />}
      header={
        <View style={styles.chips}>
          {FILTERS.map((x) => (
            <Chip key={x.f} label={x.label} selected={f === x.f} onPress={() => setF(x.f)} />
          ))}
        </View>
      }
      empty="Chưa có bài nào."
    />
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
