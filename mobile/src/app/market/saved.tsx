import { router } from 'expo-router';

import { marketApi, useMarketMutation, useSavedPosts } from '../../features/market/api';
import { PagedList, PostCard } from '../../features/market/PostCard';
import { Button, Card, InlineError, Muted } from '../../shared/ui';
import { errorMessage } from '../../shared/errors';

/** Đã lưu (spec §5.5): bài bị ẩn/chặn (`post = null`) chỉ hiện "Bài không còn khả dụng" + Bỏ lưu. */
export default function SavedScreen() {
  const q = useSavedPosts();
  const unsave = useMarketMutation((postId: number) => marketApi.save(postId, false));
  const seen = new Set<number>();
  const items = (q.data?.pages ?? []).flatMap((p) => p.items).filter((x) => !seen.has(x.postId) && !!seen.add(x.postId));
  return (
    <PagedList
      q={q}
      items={items}
      keyOf={(s) => String(s.postId)}
      header={unsave.error ? <InlineError message={errorMessage(unsave.error, 'Bỏ lưu không thành công.')} /> : undefined}
      render={(s) =>
        s.post ? (
          <PostCard p={s.post} />
        ) : (
          <Card>
            <Muted>Bài không còn khả dụng.</Muted>
            <Button title="Bỏ lưu" variant="secondary" onPress={() => unsave.mutate(s.postId)} />
          </Card>
        )
      }
      empty="Chưa lưu bài nào"
      emptyIcon="bookmark-outline"
      emptyAction={<Button title="Xem chợ đồ cũ" variant="secondary" fullWidth={false} onPress={() => router.push('/market')} />}
    />
  );
}
