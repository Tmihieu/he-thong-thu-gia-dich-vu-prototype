import 'package:flutter/material.dart';

import '../../api/market_api.dart';
import '../../api/models.dart';
import '../../shared/format.dart';
import '../../shared/labels.dart';
import '../../shared/photos.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';

/// Màu chữ theo nhãn, giống cách Chợ Tốt tô màu giá: bán cam, cho tặng xanh, tìm xanh dương, đổi vàng.
Color tagColor(String tag) => switch (tag) {
      'SELL' => AppColors.sell,
      'GIVE' => AppColors.primary,
      'FIND' => AppColors.info,
      'EXCHANGE' => AppColors.warning,
      _ => AppColors.textMuted,
    };

IconData categoryIcon(String category) => switch (category) {
      'HOUSEHOLD' => Icons.kitchen_outlined,
      'ELECTRONICS' => Icons.tv_outlined,
      'FURNITURE' => Icons.chair_outlined,
      'CHILDREN' => Icons.child_friendly_outlined,
      'TOOLS_VEHICLES' => Icons.pedal_bike_outlined,
      _ => Icons.category_outlined,
    };

const marketCategories = ['HOUSEHOLD', 'ELECTRONICS', 'FURNITURE', 'CHILDREN', 'TOOLS_VEHICLES', 'OTHER'];

String tagsText(List<String> tags) => tags.map((t) => label(marketTagLabels, t)).join(' · ');

extension MarketPostCopy on MarketPost {
  MarketPost withSaved(bool saved) => MarketPost(
        id: id,
        code: code,
        caption: caption,
        tags: tags,
        category: category,
        areaName: areaName,
        photoUrls: photoUrls,
        status: status,
        hidden: hidden,
        moderation: moderation,
        moderationNote: moderationNote,
        authorId: authorId,
        authorName: authorName,
        createdAt: createdAt,
        editedAt: editedAt,
        version: version,
        commentCount: commentCount,
        canComment: canComment,
        canCall: canCall,
        mine: mine,
        saved: saved,
      );
}

/// Lưu / bỏ lưu tin; trả về trạng thái mới, hoặc null khi lỗi (đã báo snackbar).
Future<bool?> toggleSaved(BuildContext context, MarketPost post) async {
  final next = !post.saved;
  try {
    await marketApi.save(post.id, next);
    refreshBus.bump(const [Topics.market]);
    return next;
  } catch (e) {
    if (context.mounted) showSnack(context, next ? 'Không lưu được tin. Vui lòng thử lại.' : 'Không bỏ lưu được tin.');
    return null;
  }
}

/// Nhãn kiểm duyệt cho bài của chính mình (Chờ duyệt / Đã gỡ / Đã ẩn / Đã xong).
List<Widget> ownerStatusTags(MarketPost p) => [
      if (p.moderation == 'PENDING_REVIEW') const Tag('Chờ duyệt', tone: Tone.warning),
      if (p.moderation == 'REJECTED') const Tag('Đã gỡ', tone: Tone.danger),
      if (p.hidden) const Tag('Đã ẩn'),
      if (p.closed) const Tag('Đã xong', tone: Tone.success),
    ];

/// Thẻ tin dạng lưới kiểu Chợ Tốt: ảnh vuông, tiêu đề 2 dòng, nhãn màu, tổ · thời gian.
class PostCard extends StatelessWidget {
  const PostCard({super.key, required this.post, required this.onTap, this.onToggleSave, this.showStatus = false});

  final MarketPost post;
  final VoidCallback onTap;
  final VoidCallback? onToggleSave;
  final bool showStatus;

  @override
  Widget build(BuildContext context) {
    final p = post;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(Radii.sm),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (p.photoUrls.isEmpty)
                    Container(
                      color: AppColors.iconBg,
                      child: Icon(categoryIcon(p.category), size: 48, color: AppColors.border),
                    )
                  else
                    AuthImage(p.photoUrls.first),
                  if (p.closed)
                    Container(
                      color: Colors.black45,
                      alignment: Alignment.center,
                      child: const Text('Đã xong',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                    ),
                  Positioned(
                    left: 6,
                    top: 6,
                    child: _pill(label(marketTagLabels, p.tags.firstOrNull), tagColor(p.tags.firstOrNull ?? '')),
                  ),
                  if (p.photoUrls.length > 1)
                    Positioned(
                      left: 6,
                      bottom: 6,
                      child: _pill('▣ ${p.photoUrls.length}', Colors.black54),
                    ),
                  if (onToggleSave != null && !p.mine)
                    Positioned(
                      right: 2,
                      top: 2,
                      child: IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: onToggleSave,
                        icon: Icon(
                          p.saved ? Icons.favorite : Icons.favorite_border,
                          color: p.saved ? AppColors.badge : Colors.white,
                          shadows: const [Shadow(blurRadius: 4, color: Colors.black54)],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, height: 1.3, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    tagsText(p.tags),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: tagColor(p.tags.firstOrNull ?? ''),
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Muted('${p.areaName} · ${relativeTime(p.createdAt)}', size: 11, maxLines: 1),
                      ),
                      if (p.commentCount > 0) ...[
                        const Icon(Icons.chat_bubble_outline, size: 12, color: AppColors.textMuted),
                        const SizedBox(width: 2),
                        Muted('${p.commentCount}', size: 11),
                      ],
                    ],
                  ),
                  if (showStatus) ...[
                    const SizedBox(height: 6),
                    Wrap(spacing: 4, runSpacing: 4, children: ownerStatusTags(p)),
                    if (p.moderationNote != null && p.moderation != 'PUBLISHED') ...[
                      const SizedBox(height: 4),
                      Muted(p.moderationNote!, size: 11, maxLines: 3),
                    ],
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _pill(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(Radii.pill)),
        child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
      );
}

/// Lưới 2 cột cho danh sách tin (dùng trong CustomScrollView).
SliverGrid postGrid(List<MarketPost> posts, Widget Function(MarketPost) card) => SliverGrid(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: Gap.sm,
        crossAxisSpacing: Gap.sm,
        mainAxisExtent: 300,
      ),
      delegate: SliverChildBuilderDelegate((_, i) => card(posts[i]), childCount: posts.length),
    );

/// Gọi [onEnd] khi cuộn gần cuối danh sách (tải trang tiếp theo).
class LoadMoreListener extends StatelessWidget {
  const LoadMoreListener({super.key, required this.onEnd, required this.child});

  final VoidCallback onEnd;
  final Widget child;

  @override
  Widget build(BuildContext context) => NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 600) onEnd();
          return false;
        },
        child: child,
      );
}
