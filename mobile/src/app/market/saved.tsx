import { useSavedPosts, marketApi, useMarketMutation } from '../../features/market/api';
import { PagedList, PostCard } from '../../features/market/PostCard';
import { Button, Card, Muted } from '../../shared/ui';

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
      render={(s) =>
        s.post ? (
          <PostCard p={s.post} />
        ) : (
          <Card>
            <Muted>Bài không còn khả dụng.</Muted>
            <Button title="Bỏ lưu" variant="ghost" onPress={() => unsave.mutate(s.postId)} />
          </Card>
        )
      }
      empty="Chưa lưu bài nào."
    />
  );
}
