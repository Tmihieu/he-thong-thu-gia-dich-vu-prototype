import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate } from '../../shared/format';
import { MARKET_CATEGORY_LABELS, MARKET_TAG_LABELS } from '../../shared/labels';
import { colors, radius, size, spacing, type as t } from '../../shared/theme';
import { EmptyState, ErrorState, Loading, OfflineBar, Tag, type IconName } from '../../shared/ui';
import { StoredPhoto } from '../photos/PhotoStrip';
import type { MarketPost } from './api';

const THUMB_SIZE = { width: size.thumb, height: size.thumb };

export const openPost = (id: number) => router.push({ pathname: '/market/[id]', params: { id: String(id) } });

/** Bài trong chợ: nhãn, caption rút gọn, ảnh đầu, danh mục, tổ, thời gian, số bình luận. Không có giá (spec §5). */
export function PostCard({ p }: { p: MarketPost }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.caption}. ${MARKET_CATEGORY_LABELS[p.category]}, ${p.area.name}, ${p.commentCount} bình luận`}
      onPress={() => openPost(p.id)}
      style={({ pressed }) => [styles.post, pressed && styles.postPressed]}
    >
      <View style={styles.body}>
        <PostTags p={p} />
        <Text style={styles.text} numberOfLines={3}>
          {p.caption}
        </Text>
        <Text style={styles.meta}>
          {MARKET_CATEGORY_LABELS[p.category]}, {p.area.name}
        </Text>
        <Text style={styles.meta}>
          {formatDate(p.createdAt)}, {p.commentCount} bình luận
        </Text>
      </View>
      {p.photoUrls[0] ? <StoredPhoto url={p.photoUrls[0]} size={THUMB_SIZE} /> : null}
    </Pressable>
  );
}

export function PostTags({ p }: { p: MarketPost }) {
  return (
    <View style={styles.tags}>
      {p.tags.map((tag) => (
        <Tag key={tag} tone="info">
          {MARKET_TAG_LABELS[tag]}
        </Tag>
      ))}
      {p.status === 'CLOSED' ? <Tag>Đã xong</Tag> : null}
      {p.hidden ? <Tag tone="warning">Đã ẩn</Tag> : null}
    </View>
  );
}

type Paged = {
  data?: { pages: { items: unknown[] }[] };
  isPending: boolean;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: unknown;
  refetch: () => unknown;
  fetchNextPage: () => unknown;
};

/**
 * Danh sách phân trang dùng chung (feed, tin của tôi, đã lưu, đã chặn): cuộn tới cuối tải trang sau, kéo làm mới,
 * đang tải / lỗi + thử lại / rỗng.
 */
export function PagedList<T>({
  q,
  items,
  keyOf,
  render,
  header,
  empty,
  emptyIcon,
  emptyAction,
}: {
  q: Paged;
  items: T[];
  keyOf: (x: T) => string;
  render: (x: T) => ReactElement;
  header?: ReactElement;
  empty: string;
  emptyIcon?: IconName;
  /** Việc làm tiếp khi danh sách trống (đăng bài, xóa bộ lọc...). */
  emptyAction?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.flex}>
      <OfflineBar />
      <FlatList
        data={items}
        keyExtractor={keyOf}
        renderItem={({ item }) => render(item)}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.list, { paddingBottom: spacing.xxl + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage && !q.error) void q.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching && !q.isFetchingNextPage}
            onRefresh={() => void q.refetch()}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListFooterComponent={
          q.isPending || q.isFetchingNextPage ? (
            <Loading />
          ) : q.error ? (
            <ErrorState
              error={q.error}
              fallback="Không tải được dữ liệu."
              compact={!!q.data}
              onRetry={() => void (q.data ? q.fetchNextPage() : q.refetch())}
            />
          ) : items.length === 0 ? (
            <EmptyState icon={emptyIcon} title={empty} action={emptyAction} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  post: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  postPressed: { backgroundColor: colors.brandSoft },
  body: { flex: 1, gap: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  list: { padding: spacing.lg, gap: spacing.md },
  text: { ...t.body, color: colors.text },
  meta: { ...t.caption, color: colors.textMuted },
});
