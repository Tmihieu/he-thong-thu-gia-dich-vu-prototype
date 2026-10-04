import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { flattenUnique, useMarketFeed, useMarketMetadata, type FeedFilter } from '../../features/market/api';
import { PagedList, PostCard } from '../../features/market/PostCard';
import { MARKET_CATEGORY_LABELS, MARKET_TAG_LABELS, type MarketTag } from '../../shared/labels';
import { colors, radius, spacing, type as t } from '../../shared/theme';
import { Button, Chip, Field, IconCircle, ListGroup, ListRow, Muted, SectionTitle, type IconName } from '../../shared/ui';

const TAGS = Object.keys(MARKET_TAG_LABELS) as MarketTag[];

const QUICK: { label: string; icon: IconName; to: Href }[] = [
  { label: 'Tin của tôi', icon: 'documents-outline', to: '/market/mine' },
  { label: 'Đã lưu', icon: 'bookmark-outline', to: '/market/saved' },
  { label: 'Đã chặn', icon: 'ban-outline', to: '/market/blocks' },
];

/** Chợ đồ cũ (spec §5.1): tìm caption, chips nhiều nhãn (OR), một danh mục, một tổ; tải thêm khi cuộn. */
export default function MarketTab() {
  const [text, setText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>({ q: '', tags: [] });
  const meta = useMarketMetadata();
  const feed = useMarketFeed(filter);
  const filtering = !!(filter.q || filter.tags.length || filter.category || filter.areaId);
  const set = (patch: Partial<FeedFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const toggleTag = (tag: MarketTag) =>
    set({ tags: filter.tags.includes(tag) ? filter.tags.filter((x) => x !== tag) : [...filter.tags, tag] });

  const header = (
    <View style={styles.header}>
      <Button title="Đăng bài" icon="add-circle-outline" onPress={() => router.push('/market/new')} />
      <View style={styles.quick}>
        {QUICK.map((q) => (
          <Pressable
            key={q.label}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            onPress={() => router.push(q.to)}
            style={({ pressed }) => [styles.quickItem, pressed && styles.quickPressed]}
          >
            <IconCircle name={q.icon} size={36} />
            <Text style={styles.quickLabel}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <Field
        label="Tìm trong chợ"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => set({ q: text.trim() })}
        onEndEditing={() => set({ q: text.trim() })}
        returnKeyType="search"
        placeholder="Tên món đồ, từ khóa"
        maxLength={100}
      />

      <View style={styles.filterBlock}>
        <Muted>Loại tin (chọn được nhiều)</Muted>
        <View style={styles.chips}>
          {TAGS.map((tag) => (
            <Chip key={tag} multi label={MARKET_TAG_LABELS[tag]} selected={filter.tags.includes(tag)} onPress={() => toggleTag(tag)} />
          ))}
        </View>
      </View>
      <Button
        title={filterOpen ? 'Ẩn lọc danh mục, khu vực' : filter.category || filter.areaId ? 'Lọc danh mục, khu vực (đang bật)' : 'Lọc danh mục, khu vực'}
        variant="quiet"
        compact
        icon={filterOpen ? 'chevron-up' : 'options-outline'}
        onPress={() => setFilterOpen((o) => !o)}
      />
      {filterOpen ? (
        <>
      <View style={styles.filterBlock}>
        <Muted>Danh mục</Muted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <Chip label="Tất cả" selected={!filter.category} onPress={() => set({ category: undefined })} />
          {(meta.data?.categories ?? []).map((c) => (
            <Chip key={c} label={MARKET_CATEGORY_LABELS[c]} selected={filter.category === c} onPress={() => set({ category: c })} />
          ))}
        </ScrollView>
      </View>
      <View style={styles.filterBlock}>
        <Muted>Tổ, ấp, thôn</Muted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <Chip label="Tất cả" selected={!filter.areaId} onPress={() => set({ areaId: undefined })} />
          {(meta.data?.areas ?? []).map((a) => (
            <Chip key={a.id} label={a.name} selected={filter.areaId === a.id} onPress={() => set({ areaId: a.id })} />
          ))}
        </ScrollView>
      </View>
        </>
      ) : null}

      <SectionTitle>Bài mới</SectionTitle>
    </View>
  );

  return (
    <PagedList
      q={feed}
      items={flattenUnique(feed.data?.pages)}
      keyOf={(p) => String(p.id)}
      render={(p) => <PostCard p={p} />}
      header={header}
      empty={filtering ? 'Không có bài phù hợp bộ lọc' : 'Chợ chưa có bài nào'}
      emptyIcon="storefront-outline"
      emptyAction={
        filtering ? (
          <Button
            title="Xóa bộ lọc"
            variant="secondary"
            fullWidth={false}
            onPress={() => {
              setText('');
              setFilter({ q: '', tags: [] });
            }}
          />
        ) : (
          <Button title="Đăng bài đầu tiên" variant="secondary" fullWidth={false} onPress={() => router.push('/market/new')} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.lg, marginBottom: spacing.xs },
  quick: { flexDirection: 'row', gap: spacing.sm },
  quickItem: {
    flex: 1,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: spacing.md,
  },
  quickPressed: { backgroundColor: colors.brandSoft },
  quickLabel: { ...t.caption, fontWeight: '700', color: colors.text, textAlign: 'center' },
  filterBlock: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
});
