import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/market_api.dart';
import '../../api/models.dart';
import '../../shared/labels.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';
import 'market_common.dart';

/// Chợ đồ cũ kiểu Chợ Tốt: ô tìm kiếm trên thanh tiêu đề, lối tắt, dải danh mục và lưới tin 2 cột.
class MarketFeedScreen extends StatefulWidget {
  const MarketFeedScreen({super.key});

  @override
  State<MarketFeedScreen> createState() => _MarketFeedScreenState();
}

class _MarketFeedScreenState extends State<MarketFeedScreen> {
  final _search = TextEditingController();
  final _metadata = Query(marketApi.metadata);
  late final PagedQuery<MarketPost> _feed = PagedQuery(_fetcher(), keyOf: (p) => p.id, topics: const [Topics.market]);
  FeedFilter _filter = const FeedFilter();
  Timer? _debounce;

  Future<({List<MarketPost> items, bool hasMore, int total})> Function(int) _fetcher() {
    final f = _filter;
    return (page) async {
      final r = await marketApi.feed(f, page);
      return (items: r.items, hasMore: r.hasMore, total: r.total);
    };
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _metadata.dispose();
    _feed.dispose();
    super.dispose();
  }

  void _apply(FeedFilter f) {
    setState(() => _filter = f);
    _feed.setFetch(_fetcher());
  }

  void _onSearch(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () => _apply(_filter.copyWith(q: q)));
  }

  Future<void> _toggleSave(MarketPost p) async {
    _feed.replaceWhere((x) => x.id == p.id, (x) => x.withSaved(!p.saved));
    final result = await toggleSaved(context, p);
    if (result == null) _feed.replaceWhere((x) => x.id == p.id, (x) => x.withSaved(p.saved));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          titleSpacing: Gap.md,
          title: SizedBox(
            height: 40,
            child: TextField(
              controller: _search,
              onChanged: _onSearch,
              textInputAction: TextInputAction.search,
              style: const TextStyle(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Tìm đồ trong xã…',
                prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                contentPadding: EdgeInsets.zero,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Radii.pill),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Radii.pill),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Radii.pill),
                  borderSide: BorderSide.none,
                ),
                suffixIcon: _search.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () {
                          _search.clear();
                          _apply(_filter.copyWith(q: ''));
                        },
                      ),
              ),
            ),
          ),
          actions: [
            IconButton(
              tooltip: 'Lọc',
              onPressed: _openFilter,
              icon: Badge(
                isLabelVisible: _filter.count > 0,
                label: Text('${_filter.count}'),
                child: const Icon(Icons.tune),
              ),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => context.push('/posts/new'),
          backgroundColor: AppColors.sell,
          foregroundColor: Colors.white,
          icon: const Icon(Icons.edit_outlined),
          label: const Text('Đăng tin', style: TextStyle(fontWeight: FontWeight.w800)),
        ),
        body: ListenableBuilder(
          listenable: _feed,
          builder: (context, _) => RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _feed.refresh,
            child: LoadMoreListener(
              onEnd: _feed.loadMore,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: _header(context)),
                  ..._results(context),
                  const SliverToBoxAdapter(child: SizedBox(height: 96)),
                ],
              ),
            ),
          ),
        ),
      );

  Widget _header(BuildContext context) => Container(
        color: Colors.white,
        padding: const EdgeInsets.only(top: Gap.md, bottom: Gap.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 34,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: Gap.md),
                children: [
                  PillChip(
                    label: 'Tất cả',
                    selected: _filter.tags.isEmpty,
                    onTap: () => _apply(_filter.copyWith(tags: {})),
                  ),
                  for (final e in marketTagLabels.entries) ...[
                    const SizedBox(width: Gap.sm),
                    PillChip(
                      label: e.value,
                      selected: _filter.tags.contains(e.key),
                      onTap: () {
                        final tags = {..._filter.tags};
                        if (!tags.remove(e.key)) tags.add(e.key);
                        _apply(_filter.copyWith(tags: tags));
                      },
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: Gap.md),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Gap.md),
              child: Row(
                children: [
                  _shortcut(Icons.article_outlined, 'Tin của tôi', () => context.push('/posts/mine')),
                  const SizedBox(width: Gap.sm),
                  _shortcut(Icons.favorite_border, 'Đã lưu', () => context.push('/posts/saved')),
                  const SizedBox(width: Gap.sm),
                  _shortcut(Icons.block, 'Đã chặn', () => context.push('/posts/blocks')),
                ],
              ),
            ),
            const SizedBox(height: Gap.md),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: Gap.lg),
              child: Text('Khám phá danh mục', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            ),
            const SizedBox(height: Gap.sm),
            SizedBox(
              height: 86,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: Gap.md),
                itemCount: marketCategories.length,
                separatorBuilder: (_, _) => const SizedBox(width: Gap.xs),
                itemBuilder: (_, i) {
                  final c = marketCategories[i];
                  final selected = _filter.category == c;
                  return InkWell(
                    borderRadius: BorderRadius.circular(Radii.sm),
                    onTap: () => _apply(_filter.copyWith(category: () => selected ? null : c)),
                    child: SizedBox(
                      width: 74,
                      child: Column(
                        children: [
                          Container(
                            width: 52,
                            height: 52,
                            decoration: BoxDecoration(
                              color: selected ? AppColors.chrome : AppColors.primarySoft,
                              borderRadius: BorderRadius.circular(Radii.md),
                            ),
                            child: Icon(categoryIcon(c), color: selected ? Colors.white : AppColors.primary),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            label(marketCategoryLabels, c),
                            maxLines: 2,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              height: 1.15,
                              fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      );

  Widget _shortcut(IconData icon, String text, VoidCallback onTap) => Expanded(
        child: Material(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(Radii.sm),
          child: InkWell(
            borderRadius: BorderRadius.circular(Radii.sm),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Column(
                children: [
                  Icon(icon, size: 20, color: AppColors.primary),
                  const SizedBox(height: 2),
                  Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
        ),
      );

  List<Widget> _results(BuildContext context) {
    final f = _feed;
    final title = Padding(
      padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.lg, Gap.lg, Gap.sm),
      child: Row(
        children: [
          Expanded(
            child: Text(
              _filter.q.trim().isEmpty && _filter.count == 0 ? 'Tin mới đăng' : 'Kết quả tìm kiếm',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
          ),
          if (!f.loading && f.error == null) Muted('${f.total} tin'),
        ],
      ),
    );
    if (f.items.isEmpty) {
      return [
        SliverToBoxAdapter(child: title),
        SliverToBoxAdapter(
          child: f.loading
              ? const LoadingView()
              : f.error != null
                  ? Padding(
                      padding: const EdgeInsets.all(Gap.lg),
                      child: ErrorBox(error: f.error, onRetry: f.refresh),
                    )
                  : const EmptyView('Không có bài phù hợp.', icon: Icons.storefront_outlined),
        ),
      ];
    }
    return [
      SliverToBoxAdapter(child: title),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: Gap.sm),
        sliver: postGrid(
          f.items,
          (p) => PostCard(
            post: p,
            onTap: () => context.push('/posts/${p.id}'),
            onToggleSave: () => _toggleSave(p),
          ),
        ),
      ),
      if (f.loadingMore)
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.all(Gap.lg),
            child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
          ),
        ),
    ];
  }

  Future<void> _openFilter() async {
    final result = await showModalBottomSheet<FeedFilter>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (context) => _FilterSheet(initial: _filter, metadata: _metadata.data),
    );
    if (result != null) _apply(result);
  }
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.initial, required this.metadata});

  final FeedFilter initial;
  final MarketMetadata? metadata;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late Set<String> _tags = {...widget.initial.tags};
  late String? _category = widget.initial.category;
  late int? _areaId = widget.initial.areaId;

  @override
  Widget build(BuildContext context) {
    final areas = widget.metadata?.areas ?? const <MarketArea>[];
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Gap.lg, 0, Gap.lg, Gap.lg),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Bold('Lọc tin', size: 18),
              const SizedBox(height: Gap.md),
              const FieldLabel('Nhãn'),
              ChipWrap(children: [
                for (final e in marketTagLabels.entries)
                  PillChip(
                    label: e.value,
                    selected: _tags.contains(e.key),
                    onTap: () => setState(() => _tags.contains(e.key) ? _tags.remove(e.key) : _tags.add(e.key)),
                  ),
              ]),
              const SizedBox(height: Gap.md),
              const FieldLabel('Danh mục'),
              ChipWrap(children: [
                for (final c in marketCategories)
                  PillChip(
                    label: label(marketCategoryLabels, c),
                    icon: categoryIcon(c),
                    selected: _category == c,
                    onTap: () => setState(() => _category = _category == c ? null : c),
                  ),
              ]),
              if (areas.isNotEmpty) ...[
                const SizedBox(height: Gap.md),
                const FieldLabel('Tổ / ấp'),
                ChipWrap(children: [
                  for (final a in areas)
                    PillChip(
                      label: a.name,
                      selected: _areaId == a.id,
                      onTap: () => setState(() => _areaId = _areaId == a.id ? null : a.id),
                    ),
                ]),
              ],
              const SizedBox(height: Gap.xl),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() {
                        _tags = {};
                        _category = null;
                        _areaId = null;
                      }),
                      child: const Text('Xóa lọc'),
                    ),
                  ),
                  const SizedBox(width: Gap.md),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.pop(
                        context,
                        widget.initial.copyWith(tags: _tags, category: () => _category, areaId: () => _areaId),
                      ),
                      child: const Text('Áp dụng'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
