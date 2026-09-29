import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';

import { formatDate } from '../../shared/format';
import { MARKET_CATEGORY_LABELS, MARKET_TAG_LABELS } from '../../shared/labels';
import { colors, spacing } from '../../shared/theme';
import { Card, Empty, ErrorBox, Loading, Muted, Tag } from '../../shared/ui';
import { StoredPhoto } from '../photos/PhotoStrip';
import type { MarketPost } from './api';

const THUMB_SIZE = { width: 72, height: 72 };

export const openPost = (id: number) => router.push({ pathname: '/market/[id]', params: { id: String(id) } });

/** Thẻ bài: caption rút gọn, ảnh đầu, mọi nhãn, danh mục, tổ, thời gian, số bình luận. Không có giá (spec §5). */
export function PostCard({ p }: { p: MarketPost }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => openPost(p.id)} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.post}>
        {p.photoUrls[0] ? <StoredPhoto url={p.photoUrls[0]} size={THUMB_SIZE} /> : null}
        <View style={styles.body}>
          <PostTags p={p} />
          <Text style={styles.text} numberOfLines={3}>
            {p.caption}
          </Text>
          <Muted>
            {MARKET_CATEGORY_LABELS[p.category]} · {p.area.name} · {formatDate(p.createdAt)} · {p.commentCount} bình luận
          </Muted>
        </View>
      </Card>
    </Pressable>
  );
}

export function PostTags({ p }: { p: MarketPost }) {
  return (
    <View style={styles.tags}>
      {p.tags.map((t) => (
        <Tag key={t} tone="info">
          {MARKET_TAG_LABELS[t]}
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
}: {
  q: Paged;
  items: T[];
  keyOf: (x: T) => string;
  render: (x: T) => ReactElement;
  header?: ReactElement;
  empty: string;
}) {
  return (
    <FlatList
      data={items}
      keyExtractor={keyOf}
      renderItem={({ item }) => render(item)}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage && !q.error) void q.fetchNextPage();
      }}
      refreshControl={
        <RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={() => void q.refetch()} tintColor={colors.primary} />
      }
      ListFooterComponent={
        q.isPending || q.isFetchingNextPage ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox
            message={q.error instanceof ApiError ? q.error.message : 'Không tải được dữ liệu.'}
            onRetry={() => void (q.data ? q.fetchNextPage() : q.refetch())}
          />
        ) : items.length === 0 ? (
          <Card>
            <Empty>{empty}</Empty>
          </Card>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  post: { flexDirection: 'row', gap: spacing.md },
  body: { flex: 1, gap: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  text: { fontSize: 15, color: colors.text, lineHeight: 21 },
});
