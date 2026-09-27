import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useMarketPosts, type MarketPost } from '../../features/citizen/api';
import { StoredPhoto } from '../../features/photos/PhotoStrip';
import { formatDate } from '../../shared/format';
import { MARKET_TYPE_LABELS, type MarketPostType } from '../../shared/labels';
import { colors, spacing } from '../../shared/theme';
import { Button, Card, Chip, Empty, ErrorBox, Loading, Muted, Screen, Tag } from '../../shared/ui';

const THUMB_SIZE = { width: 64, height: 64 };

const FILTERS: { type: MarketPostType | undefined; label: string }[] = [
  { type: undefined, label: 'Tất cả' },
  { type: 'GIVE', label: MARKET_TYPE_LABELS.GIVE },
  { type: 'EXCHANGE', label: MARKET_TYPE_LABELS.EXCHANGE },
];

/** Chợ đồ cũ như prototype `citizenMarket`: bài đang đăng, lọc Cho tặng / Trao đổi, kéo để tải lại. */
export default function MarketTab() {
  const [type, setType] = useState<MarketPostType | undefined>(undefined);
  const list = useMarketPosts(type);

  return (
    <Screen refreshing={list.isFetching && !list.isPending} onRefresh={() => void list.refetch()}>
      <Card style={styles.tip}>
        <Text style={styles.tipText}>
          Cho tặng hoặc trao đổi đồ không còn dùng trong xã để giảm rác cồng kềnh. Vật dụng không ai nhận thì{' '}
          <Text style={styles.link} onPress={() => router.push('/bulky/new')}>
            đăng ký thu gom cồng kềnh
          </Text>
          .
        </Text>
      </Card>
      <Button title="Đăng bài" onPress={() => router.push('/market/new')} />
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f.label} label={f.label} selected={f.type === type} onPress={() => setType(f.type)} />
        ))}
      </View>
      {list.isPending ? <Loading /> : null}
      {list.error ? (
        <ErrorBox
          message={list.error instanceof ApiError ? list.error.message : 'Không tải được chợ đồ cũ.'}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.data?.length === 0 ? (
        <Card>
          <Empty>Chưa có bài nào đang đăng.</Empty>
        </Card>
      ) : null}
      {list.data?.map((p) => <PostCard key={p.id} p={p} />)}
    </Screen>
  );
}

function PostCard({ p }: { p: MarketPost }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/market/[id]', params: { id: String(p.id) } })}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={styles.post}>
        {p.photoUrls[0] ? <StoredPhoto url={p.photoUrls[0]} size={THUMB_SIZE} /> : null}
        <View style={styles.body}>
          <View style={styles.top}>
            <Text style={styles.title}>{p.title}</Text>
            <Tag tone={p.postType === 'GIVE' ? 'success' : 'info'}>{MARKET_TYPE_LABELS[p.postType]}</Tag>
          </View>
          <Text style={styles.text} numberOfLines={2}>
            {p.description}
          </Text>
          <Muted>
            {p.author.displayName} · {p.author.areaName} · {formatDate(p.createdAt)} · {p.commentCount} bình luận
          </Muted>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tip: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tipText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  link: { color: colors.primaryDark, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pressed: { opacity: 0.7 },
  post: { flexDirection: 'row', gap: spacing.md },
  body: { flex: 1, gap: spacing.xs },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  text: { fontSize: 14, color: colors.text },
});
