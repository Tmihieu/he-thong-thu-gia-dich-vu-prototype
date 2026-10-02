import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/market_api.dart';
import '../../api/models.dart';
import '../../shared/format.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';
import 'market_common.dart';

typedef _Page<T> = ({List<T> items, bool hasMore, int total});

_Page<T> _page<T>(PageResult<T> r) => (items: r.items, hasMore: r.hasMore, total: r.total);

/// Khung chung: kéo để tải lại, cuộn gần cuối thì tải thêm, rỗng / lỗi / đang tải.
class _PagedBody<T> extends StatelessWidget {
  const _PagedBody({required this.query, required this.empty, required this.slivers});

  final PagedQuery<T> query;
  final Widget empty;
  final List<Widget> Function(List<T> items) slivers;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: query,
        builder: (context, _) => RefreshIndicator(
          color: AppColors.primary,
          onRefresh: query.refresh,
          child: LoadMoreListener(
            onEnd: query.loadMore,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (query.items.isEmpty)
                  SliverToBoxAdapter(
                    child: query.loading
                        ? const LoadingView()
                        : query.error != null
                            ? Padding(
                                padding: const EdgeInsets.all(Gap.lg),
                                child: ErrorBox(error: query.error, onRetry: query.refresh),
                              )
                            : empty,
                  )
                else
                  ...slivers(query.items),
                if (query.loadingMore)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(Gap.lg),
                      child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                    ),
                  ),
                const SliverToBoxAdapter(child: SizedBox(height: Gap.xl * 2)),
              ],
            ),
          ),
        ),
      );
}

class MyPostsScreen extends StatefulWidget {
  const MyPostsScreen({super.key});

  @override
  State<MyPostsScreen> createState() => _MyPostsScreenState();
}

class _MyPostsScreenState extends State<MyPostsScreen> {
  static const _filters = [(MineFilter.open, 'Đang đăng'), (MineFilter.closed, 'Đã xong'), (MineFilter.hidden, 'Đã ẩn')];

  MineFilter _filter = MineFilter.open;
  late final _q = PagedQuery<MarketPost>(_fetcher(), keyOf: (p) => p.id, topics: const [Topics.market]);

  Future<_Page<MarketPost>> Function(int) _fetcher() {
    final f = _filter;
    return (page) async => _page(await marketApi.mine(f, page));
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Tin của tôi')),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => context.push('/posts/new'),
          backgroundColor: AppColors.sell,
          foregroundColor: Colors.white,
          icon: const Icon(Icons.edit_outlined),
          label: const Text('Đăng tin', style: TextStyle(fontWeight: FontWeight.w800)),
        ),
        body: Column(
          children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: Gap.lg, vertical: Gap.sm),
              child: Row(children: [
                for (final (f, text) in _filters) ...[
                  PillChip(
                    label: text,
                    selected: _filter == f,
                    onTap: () {
                      if (f == _filter) return;
                      setState(() => _filter = f);
                      _q.setFetch(_fetcher());
                    },
                  ),
                  const SizedBox(width: Gap.sm),
                ],
              ]),
            ),
            Expanded(
              child: _PagedBody<MarketPost>(
                query: _q,
                empty: const EmptyView('Chưa có bài nào.', icon: Icons.article_outlined),
                slivers: (items) => [
                  SliverPadding(
                    padding: const EdgeInsets.all(Gap.sm),
                    sliver: postGrid(
                      items,
                      (p) => PostCard(post: p, showStatus: true, onTap: () => context.push('/posts/${p.id}')),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class SavedPostsScreen extends StatefulWidget {
  const SavedPostsScreen({super.key});

  @override
  State<SavedPostsScreen> createState() => _SavedPostsScreenState();
}

class _SavedPostsScreenState extends State<SavedPostsScreen> {
  final _q = PagedQuery<MarketSaved>(
    (page) async => _page(await marketApi.saved(page)),
    keyOf: (s) => s.postId,
    topics: const [Topics.market],
  );

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  Future<void> _unsave(int postId) async {
    try {
      await marketApi.save(postId, false);
      _q.removeWhere((s) => s.postId == postId);
      refreshBus.bump(const [Topics.market]);
    } catch (_) {
      if (mounted) showSnack(context, 'Không bỏ lưu được tin.');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Tin đã lưu')),
        body: _PagedBody<MarketSaved>(
          query: _q,
          empty: const EmptyView('Chưa lưu bài nào.', icon: Icons.favorite_border),
          slivers: (items) {
            final live = [for (final s in items) ?s.post];
            final gone = [for (final s in items) if (s.post == null) s.postId];
            return [
              SliverPadding(
                padding: const EdgeInsets.all(Gap.sm),
                sliver: postGrid(
                  live,
                  (p) => PostCard(
                    post: p,
                    onTap: () => context.push('/posts/${p.id}'),
                    onToggleSave: () => _unsave(p.id),
                  ),
                ),
              ),
              SliverList.list(children: [
                for (final id in gone)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: Gap.sm, vertical: Gap.xs),
                    child: AppCard(children: [
                      Row(children: [
                        const Expanded(child: Muted('Bài không còn khả dụng.', size: 13)),
                        TextButton(onPressed: () => _unsave(id), child: const Text('Bỏ lưu')),
                      ]),
                    ]),
                  ),
              ]),
            ];
          },
        ),
      );
}

class BlockedUsersScreen extends StatefulWidget {
  const BlockedUsersScreen({super.key});

  @override
  State<BlockedUsersScreen> createState() => _BlockedUsersScreenState();
}

class _BlockedUsersScreenState extends State<BlockedUsersScreen> {
  final _q = PagedQuery<MarketBlock>(
    (page) async => _page(await marketApi.blocks(page)),
    keyOf: (b) => b.citizenId,
    topics: const [Topics.market],
  );

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  Future<void> _unblock(MarketBlock b) async {
    final ok = await confirmDialog(
      context,
      title: 'Bỏ chặn ${b.displayName}?',
      message: 'Bạn sẽ lại thấy bài và bình luận của ${b.displayName} trong chợ.',
      confirmLabel: 'Bỏ chặn',
    );
    if (!ok) return;
    try {
      await marketApi.block(b.citizenId, false);
      _q.removeWhere((x) => x.citizenId == b.citizenId);
      refreshBus.bump(const [Topics.market]);
    } catch (_) {
      if (mounted) showSnack(context, 'Không bỏ chặn được. Vui lòng thử lại.');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Người đã chặn')),
        body: _PagedBody<MarketBlock>(
          query: _q,
          empty: const EmptyView('Bạn chưa chặn ai.', icon: Icons.block),
          slivers: (items) => [
            SliverPadding(
              padding: const EdgeInsets.all(Gap.lg),
              sliver: SliverList.list(children: [
                for (final b in items)
                  AppCard(children: [
                    Row(children: [
                      Avatar(initials(b.displayName), size: 36),
                      const SizedBox(width: Gap.md),
                      Expanded(child: Bold(b.displayName, size: 14)),
                      TextButton(onPressed: () => _unblock(b), child: const Text('Bỏ chặn')),
                    ]),
                  ]),
              ]),
            ),
          ],
        ),
      );
}
