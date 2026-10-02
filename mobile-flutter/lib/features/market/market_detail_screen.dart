import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/client.dart';
import '../../api/market_api.dart';
import '../../api/models.dart';
import '../../shared/format.dart';
import '../../shared/labels.dart';
import '../../shared/photos.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';
import '../../shared/validate.dart';
import 'market_common.dart';

/// Chi tiết tin kiểu Chợ Tốt: ảnh lớn lướt ngang, tiêu đề + nhãn màu, mô tả, người đăng, bình luận,
/// thanh hành động dưới cùng (Lưu / Bình luận / Gọi điện).
class MarketDetailScreen extends StatefulWidget {
  const MarketDetailScreen({super.key, required this.id});

  final int id;

  @override
  State<MarketDetailScreen> createState() => _MarketDetailScreenState();
}

class _MarketDetailScreenState extends State<MarketDetailScreen> {
  late final _post = Query(() => marketApi.post(widget.id), topics: const [Topics.market]);
  late final _comments = PagedQuery<MarketComment>(
    (page) async {
      final r = await marketApi.comments(widget.id, page);
      return (items: r.items, hasMore: r.hasMore, total: r.total);
    },
    keyOf: (c) => c.id,
  );
  final _commentText = TextEditingController();
  final _commentFocus = FocusNode();
  final _scroll = ScrollController();
  final _commentsKey = GlobalKey();
  bool _busy = false;
  bool _sending = false;
  String? _commentError;
  String? _commentRequestId;

  @override
  void dispose() {
    _post.dispose();
    _comments.dispose();
    _commentText.dispose();
    _commentFocus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  bool _gone(Object? e) => e is ApiError && (e.status == 404 || e.status == 403);

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } on ApiError catch (e) {
      if (!mounted) return;
      if (e.status == 409) {
        showSnack(context, 'Bài vừa được thay đổi ở nơi khác; đã tải lại, vui lòng thử lại.');
        _post.refresh(silent: true);
      } else {
        showSnack(context, errorText(e, 'Thao tác không thành công. Vui lòng thử lại.'));
      }
    } catch (e) {
      if (mounted) showSnack(context, errorText(e, 'Thao tác không thành công. Vui lòng thử lại.'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _setHidden(MarketPost p, bool hidden) async {
    if (hidden &&
        !await confirmDialog(
          context,
          title: 'Ẩn bài đăng?',
          message: 'Người khác sẽ không thấy bài này cho tới khi bạn hiện lại.',
          confirmLabel: 'Ẩn bài',
        )) {
      return;
    }
    await _run(() async {
      await marketApi.setHidden(p.id, hidden, p.version ?? 0);
      refreshBus.bump(const [Topics.market]);
    });
  }

  Future<void> _setClosed(MarketPost p, bool closed) async {
    if (closed &&
        !await confirmDialog(
          context,
          title: 'Đánh dấu đã xong?',
          message: 'Bài rời khỏi chợ, không nhận bình luận và cuộc gọi mới. Có thể mở lại sau.',
          confirmLabel: 'Đã xong',
        )) {
      return;
    }
    await _run(() async {
      await marketApi.setStatus(p.id, closed ? 'CLOSED' : 'OPEN', p.version ?? 0);
      refreshBus.bump(const [Topics.market]);
    });
  }

  Future<void> _toggleSave(MarketPost p) async {
    final next = await toggleSaved(context, p);
    if (next != null && mounted) showSnack(context, next ? 'Đã lưu tin.' : 'Đã bỏ lưu tin.');
  }

  Future<void> _call(MarketPost p) async {
    String? phone;
    await _run(() async {
      phone = await marketApi.contact(p.id);
    });
    final number = phone;
    if (number == null || !mounted) return;
    final ok = await launchUrl(Uri(scheme: 'tel', path: number)).catchError((_) => false);
    if (!ok && mounted) showSnack(context, 'Thiết bị không mở được trình gọi. Số liên hệ: $number');
  }

  void _focusComment() {
    final ctx = _commentsKey.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx, alignment: 1, duration: const Duration(milliseconds: 300));
    }
    _commentFocus.requestFocus();
  }

  Future<void> _sendComment() async {
    final text = _commentText.text.trim();
    if (text.isEmpty) return setState(() => _commentError = 'Nhập nội dung bình luận.');
    setState(() {
      _sending = true;
      _commentError = null;
    });
    // Giữ nguyên mã yêu cầu khi gửi lại sau lỗi mạng để máy chủ không tạo trùng bình luận.
    final requestId = _commentRequestId ??= uuidV4();
    try {
      await marketApi.comment(widget.id, text, requestId);
      _commentRequestId = null;
      _commentText.clear();
      if (mounted) FocusScope.of(context).unfocus();
      await _comments.refresh(silent: true);
      refreshBus.bump(const [Topics.market]);
    } catch (e) {
      if (mounted) setState(() => _commentError = errorText(e, 'Gửi bình luận không thành công.'));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _report(MarketPost p) async {
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (_) => _ReportSheet(postId: p.id),
    );
    if (sent == true && mounted) showSnack(context, 'Đã gửi báo cáo. Cán bộ xã sẽ xem xét.');
  }

  Future<void> _block(MarketPost p) async {
    final ok = await confirmDialog(
      context,
      title: 'Chặn người đăng?',
      message: 'Hai bên sẽ không thấy bài, bình luận và số liên hệ của nhau trong chợ. '
          'Có thể bỏ chặn trong mục Đã chặn.',
      confirmLabel: 'Chặn',
      danger: true,
    );
    if (!ok) return;
    var done = false;
    await _run(() async {
      await marketApi.block(p.authorId, true);
      done = true;
      refreshBus.bump(const [Topics.market]);
    });
    if (done && mounted) {
      showSnack(context, 'Đã chặn ${p.authorName}.');
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: _post,
        builder: (context, _) {
          final p = _post.data;
          if (p == null) {
            return Scaffold(
              appBar: AppBar(title: const Text('Chi tiết tin')),
              body: _post.error == null
                  ? const Center(child: LoadingView())
                  : _gone(_post.error)
                      ? const EmptyView('Bài không còn khả dụng.', icon: Icons.remove_shopping_cart_outlined)
                      : PageList(children: [ErrorBox(error: _post.error, onRetry: _post.refresh)]),
            );
          }
          return Scaffold(
            appBar: AppBar(
              title: Text(p.code),
              actions: [
                if (!p.mine)
                  PopupMenuButton<String>(
                    onSelected: (v) => v == 'report' ? _report(p) : _block(p),
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'report', child: Text('Báo cáo bài đăng')),
                      PopupMenuItem(value: 'block', child: Text('Chặn người đăng')),
                    ],
                  ),
              ],
            ),
            bottomNavigationBar: p.mine ? null : _actionBar(p),
            body: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => Future.wait([_post.refresh(), _comments.refresh()]),
              // Dựng hết một lần (không lazy) để nút "Bình luận" cuộn tới được ô nhập ở cuối trang.
              child: SingleChildScrollView(
                controller: _scroll,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.only(bottom: Gap.xl * 2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _Gallery(post: p),
                    _summary(p),
                    if (p.mine) _ownerPanel(p),
                    _section('Mô tả chi tiết', [
                      Text(p.caption, style: const TextStyle(fontSize: 15, height: 1.5)),
                    ]),
                    _seller(p),
                    _commentSection(p),
                  ],
                ),
              ),
            ),
          );
        },
      );

  Widget _section(String title, List<Widget> children, {Key? key}) => Container(
        key: key,
        margin: const EdgeInsets.only(top: Gap.sm),
        color: Colors.white,
        padding: const EdgeInsets.all(Gap.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: Gap.md),
            ...children,
          ],
        ),
      );

  Widget _summary(MarketPost p) => Container(
        color: Colors.white,
        padding: const EdgeInsets.all(Gap.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(p.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, height: 1.3)),
            const SizedBox(height: Gap.sm),
            Text(
              tagsText(p.tags),
              style: TextStyle(color: tagColor(p.tags.firstOrNull ?? ''), fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: Gap.sm),
            Row(children: [
              Icon(categoryIcon(p.category), size: 16, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Expanded(child: Muted('${label(marketCategoryLabels, p.category)} · ${p.areaName}', size: 13)),
            ]),
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.schedule, size: 16, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Muted(
                  ['Đăng ${relativeTime(p.createdAt)}', if (p.editedAt != null) 'Đã chỉnh sửa'].join(' · '),
                  size: 13,
                ),
              ),
            ]),
            if (p.mine || p.closed) ...[
              const SizedBox(height: Gap.sm),
              Wrap(spacing: 6, runSpacing: 6, children: ownerStatusTags(p)),
            ],
          ],
        ),
      );

  Widget _ownerPanel(MarketPost p) => Container(
        margin: const EdgeInsets.only(top: Gap.sm),
        color: Colors.white,
        padding: const EdgeInsets.all(Gap.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (p.moderation == 'PENDING_REVIEW')
              Notice(
                tone: Tone.warning,
                icon: Icons.hourglass_top,
                title: 'Bài đang chờ cán bộ xã duyệt',
                body: p.moderationNote ?? 'Người khác chưa thấy bài này cho tới khi được duyệt.',
              ),
            if (p.moderation == 'REJECTED')
              Notice(
                tone: Tone.danger,
                icon: Icons.block,
                title: 'Bài đã bị gỡ',
                body: p.moderationNote ?? 'Bài vi phạm quy định của chợ nên đã bị cán bộ xã gỡ.',
              ),
            if (p.moderation != 'PUBLISHED') const SizedBox(height: Gap.md),
            const Bold('Quản lý tin của bạn', size: 14),
            const SizedBox(height: Gap.sm),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy || p.moderation == 'REJECTED' ? null : () => context.push('/posts/new?id=${p.id}'),
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('Sửa'),
                ),
              ),
              const SizedBox(width: Gap.sm),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : () => _setHidden(p, !p.hidden),
                  icon: Icon(p.hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 18),
                  label: Text(p.hidden ? 'Hiện bài' : 'Ẩn bài'),
                ),
              ),
            ]),
            const SizedBox(height: Gap.sm),
            WideButton(
              label: p.closed ? 'Mở lại' : 'Đã xong',
              icon: p.closed ? Icons.replay : Icons.check_circle_outline,
              ghost: p.closed,
              busy: _busy,
              onPressed: () => _setClosed(p, !p.closed),
            ),
          ],
        ),
      );

  Widget _seller(MarketPost p) => Container(
        margin: const EdgeInsets.only(top: Gap.sm),
        color: Colors.white,
        padding: const EdgeInsets.all(Gap.lg),
        child: Row(
          children: [
            Avatar(initials(p.authorName), size: 44),
            const SizedBox(width: Gap.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Bold(p.mine ? '${p.authorName} (bạn)' : p.authorName, size: 15),
                  const SizedBox(height: 2),
                  Muted(
                    p.canCall
                        ? 'Người dân ${p.areaName} · có thể gọi điện'
                        : 'Người dân ${p.areaName} · liên hệ qua bình luận',
                    size: 12,
                  ),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _commentSection(MarketPost p) => ListenableBuilder(
        listenable: _comments,
        builder: (context, _) {
          final c = _comments;
          return _section(
            'Bình luận (${c.loading ? p.commentCount : c.total})',
            key: _commentsKey,
            [
              if (c.loading && c.items.isEmpty)
                const LoadingView()
              else if (c.error != null && c.items.isEmpty)
                ErrorBox(error: c.error, onRetry: c.refresh)
              else if (c.items.isEmpty)
                const Muted('Chưa có bình luận.', size: 13),
              for (final m in c.items) _comment(m),
              if (c.hasMore)
                Center(
                  child: TextButton(
                    onPressed: c.loadingMore ? null : c.loadMore,
                    child: Text(c.loadingMore ? 'Đang tải…' : 'Xem thêm bình luận'),
                  ),
                ),
              const SizedBox(height: Gap.sm),
              if (p.canComment) ...[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _commentText,
                        focusNode: _commentFocus,
                        minLines: 1,
                        maxLines: 4,
                        maxLength: marketCommentMax,
                        decoration: const InputDecoration(hintText: 'Viết bình luận…', counterText: ''),
                      ),
                    ),
                    const SizedBox(width: Gap.sm),
                    FilledButton(
                      onPressed: _sending ? null : _sendComment,
                      child: _sending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Gửi'),
                    ),
                  ],
                ),
                if (_commentError != null) ErrorText(_commentError),
              ] else
                const Muted('Bài không nhận bình luận mới.', size: 13),
            ],
          );
        },
      );

  Widget _comment(MarketComment m) => Padding(
        padding: const EdgeInsets.only(bottom: Gap.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Avatar(initials(m.authorName), size: 32),
            const SizedBox(width: Gap.sm),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: Gap.md, vertical: Gap.sm),
                decoration: BoxDecoration(
                  color: m.mine ? AppColors.primarySoft : AppColors.background,
                  borderRadius: BorderRadius.circular(Radii.md),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Expanded(child: Bold(m.mine ? '${m.authorName} (bạn)' : m.authorName, size: 13)),
                      Muted(relativeTime(m.createdAt), size: 11),
                    ]),
                    const SizedBox(height: 2),
                    Text(m.content, style: const TextStyle(fontSize: 14, height: 1.4)),
                  ],
                ),
              ),
            ),
          ],
        ),
      );

  Widget _actionBar(MarketPost p) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Gap.md, Gap.sm, Gap.md, Gap.sm),
            child: Row(
              children: [
                _barButton(
                  icon: p.saved ? Icons.favorite : Icons.favorite_border,
                  text: p.saved ? 'Bỏ lưu' : 'Lưu',
                  color: p.saved ? AppColors.badge : AppColors.text,
                  onTap: () => _toggleSave(p),
                ),
                const SizedBox(width: Gap.sm),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: p.canComment ? _focusComment : null,
                    icon: const Icon(Icons.chat_bubble_outline, size: 18),
                    label: const Text('Bình luận'),
                  ),
                ),
                const SizedBox(width: Gap.sm),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: p.canCall && !_busy ? () => _call(p) : null,
                    icon: const Icon(Icons.call, size: 18),
                    label: const Text('Gọi điện'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );

  Widget _barButton({
    required IconData icon,
    required String text,
    required Color color,
    required VoidCallback onTap,
  }) =>
      InkWell(
        borderRadius: BorderRadius.circular(Radii.sm),
        onTap: onTap,
        child: SizedBox(
          width: 56,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color),
              Text(text, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      );
}

/// Ảnh lớn lướt ngang, có bộ đếm "1/3"; chạm để xem toàn màn hình.
class _Gallery extends StatefulWidget {
  const _Gallery({required this.post});

  final MarketPost post;

  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final p = widget.post;
    if (p.photoUrls.isEmpty) {
      return Container(
        height: 220,
        color: AppColors.iconBg,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(categoryIcon(p.category), size: 64, color: AppColors.border),
            const SizedBox(height: Gap.sm),
            const Muted('Người đăng chưa thêm ảnh'),
          ],
        ),
      );
    }
    return SizedBox(
      height: 300,
      child: Stack(
        children: [
          PageView.builder(
            itemCount: p.photoUrls.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) => GestureDetector(
              onTap: () => showImageViewer(context, p.photoUrls, i),
              child: Container(
                color: Colors.black,
                child: AuthImage(p.photoUrls[i], fit: BoxFit.contain),
              ),
            ),
          ),
          Positioned(
            right: Gap.md,
            bottom: Gap.md,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(Radii.pill)),
              child: Text(
                '${_index + 1}/${p.photoUrls.length}',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          if (p.closed)
            Positioned(
              left: Gap.md,
              top: Gap.md,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(Radii.pill)),
                child: const Text('Đã xong',
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
              ),
            ),
        ],
      ),
    );
  }
}

class _ReportSheet extends StatefulWidget {
  const _ReportSheet({required this.postId});

  final int postId;

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  final _note = TextEditingController();
  String? _reason;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final reason = _reason;
    if (reason == null) return setState(() => _error = 'Chọn lý do báo cáo.');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final note = _note.text.trim();
      await marketApi.report(widget.postId, reason, note.isEmpty ? null : note);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Gửi báo cáo không thành công.'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(Gap.lg, 0, Gap.lg, Gap.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Bold('Báo cáo bài đăng', size: 18),
                const SizedBox(height: 4),
                const Muted('Cán bộ xã sẽ xem xét và gỡ bài nếu vi phạm.'),
                const SizedBox(height: Gap.sm),
                RadioGroup<String>(
                  groupValue: _reason,
                  onChanged: (v) => setState(() => _reason = v),
                  child: Column(
                    children: [
                      for (final e in reportReasonLabels.entries)
                        RadioListTile<String>(
                          value: e.key,
                          title: Text(e.value),
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                    ],
                  ),
                ),
                TextField(
                  controller: _note,
                  minLines: 2,
                  maxLines: 4,
                  maxLength: 500,
                  decoration: const InputDecoration(hintText: 'Ghi chú thêm (không bắt buộc)'),
                ),
                if (_error != null) ErrorText(_error),
                const SizedBox(height: Gap.sm),
                WideButton(label: 'Gửi báo cáo', busy: _busy, danger: true, onPressed: _submit),
              ],
            ),
          ),
        ),
      );
}
