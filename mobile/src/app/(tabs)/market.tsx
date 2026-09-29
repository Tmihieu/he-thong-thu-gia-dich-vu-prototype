import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { flattenUnique, useMarketFeed, useMarketMetadata, type FeedFilter } from '../../features/market/api';
import { PagedList, PostCard } from '../../features/market/PostCard';
import { MARKET_CATEGORY_LABELS, MARKET_TAG_LABELS, type MarketTag } from '../../shared/labels';
import { colors, radius, spacing } from '../../shared/theme';
import { Button, Chip } from '../../shared/ui';

const TAGS = Object.keys(MARKET_TAG_LABELS) as MarketTag[];

/** Chợ đồ cũ (spec §5.1): tìm caption, chips nhiều nhãn (OR), một danh mục, một tổ; tải thêm khi cuộn. */
export default function MarketTab() {
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<FeedFilter>({ q: '', tags: [] });
  const meta = useMarketMetadata();
  const feed = useMarketFeed(filter);
  const set = (patch: Partial<FeedFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const toggleTag = (t: MarketTag) =>
    set({ tags: filter.tags.includes(t) ? filter.tags.filter((x) => x !== t) : [...filter.tags, t] });

  const header = (
    <View style={styles.header}>
      <Button title="Đăng bài" onPress={() => router.push('/market/new')} />
      <View style={styles.row}>
        <Link label="Tin của tôi" to="/market/mine" />
        <Link label="Đã lưu" to="/market/saved" />
        <Link label="Đã chặn" to="/market/blocks" />
      </View>
      <TextInput
        accessibilityLabel="Tìm trong chợ"
        style={styles.input}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => set({ q: text.trim() })}
        onEndEditing={() => set({ q: text.trim() })}
        returnKeyType="search"
        placeholder="Tìm đồ…"
        placeholderTextColor={colors.textMuted}
        maxLength={100}
      />
      <View style={styles.chips}>
        {TAGS.map((t) => (
          <Chip key={t} label={MARKET_TAG_LABELS[t]} selected={filter.tags.includes(t)} onPress={() => toggleTag(t)} />
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Chip label="Mọi danh mục" selected={!filter.category} onPress={() => set({ category: undefined })} />
        {(meta.data?.categories ?? []).map((c) => (
          <Chip key={c} label={MARKET_CATEGORY_LABELS[c]} selected={filter.category === c} onPress={() => set({ category: c })} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Chip label="Mọi tổ" selected={!filter.areaId} onPress={() => set({ areaId: undefined })} />
        {(meta.data?.areas ?? []).map((a) => (
          <Chip key={a.id} label={a.name} selected={filter.areaId === a.id} onPress={() => set({ areaId: a.id })} />
        ))}
      </ScrollView>
      <Link label="Đồ không ai nhận? Đăng ký thu gom cồng kềnh" to="/bulky/new" />
    </View>
  );

  return (
    <PagedList
      q={feed}
      items={flattenUnique(feed.data?.pages)}
      keyOf={(p) => String(p.id)}
      render={(p) => <PostCard p={p} />}
      header={header}
      empty="Không có bài phù hợp."
    />
  );
}

function Link({ label, to }: { label: string; to: Href }) {
  return (
    <Text accessibilityRole="link" style={styles.link} onPress={() => router.push(to)}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  link: { color: colors.primaryDark, fontWeight: '800', fontSize: 15, paddingVertical: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
