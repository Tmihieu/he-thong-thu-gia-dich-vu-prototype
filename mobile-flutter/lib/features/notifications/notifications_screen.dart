import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/citizen_api.dart';
import '../../api/models.dart';
import '../../shared/format.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';
import '../../shared/unread.dart';
import 'links.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  static const _segments = [(null, 'Tất cả'), ('COMPLAINT', 'Phản ánh'), ('TRANSACTION', 'Giao dịch')];

  String? _kind;
  late Query<NotificationPage> _q = _query();

  Query<NotificationPage> _query() => Query(
        () => citizenApi.notifications(kind: _kind),
        topics: const [Topics.notifications],
        poll: const Duration(seconds: 30),
      );

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  void _select(String? kind) {
    if (kind == _kind) return;
    final old = _q;
    setState(() {
      _kind = kind;
      _q = _query();
    });
    old.dispose();
  }

  Future<void> _open(AppNotification n) async {
    if (n.readAt == null) {
      citizenApi.markRead(n.id).then((_) {
        refreshBus.bump(const [Topics.notifications]);
      }).ignore();
    }
    final route = notificationRoute(n.link);
    if (route == null) return;
    if (route == '/market') {
      context.go(route);
    } else {
      context.push(route);
    }
  }

  Future<void> _readAll() async {
    await citizenApi.markAllRead();
    refreshBus.bump(const [Topics.notifications]);
    unread.refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Thông báo')),
        body: Column(
          children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: Gap.lg, vertical: Gap.sm),
              child: Row(
                children: [
                  for (final (kind, text) in _segments) ...[
                    PillChip(label: text, selected: _kind == kind, onTap: () => _select(kind)),
                    const SizedBox(width: Gap.sm),
                  ],
                ],
              ),
            ),
            Expanded(
              child: QueryView<NotificationPage>(
                query: _q,
                builder: (context, page) => RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _q.refresh,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.only(bottom: Gap.xl * 2),
                    children: [
                      if (page.unreadCount > 0)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.sm, Gap.sm, 0),
                          child: Row(
                            children: [
                              Expanded(child: Muted('${page.unreadCount} chưa đọc', size: 13)),
                              TextButton(onPressed: _readAll, child: const Text('Đánh dấu tất cả đã đọc')),
                            ],
                          ),
                        ),
                      if (page.items.isEmpty)
                        const EmptyView('Chưa có thông báo trong mục này.', icon: Icons.notifications_none),
                      for (final n in page.items) _row(n),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _row(AppNotification n) {
    final isUnread = n.readAt == null;
    final (IconData filled, IconData outlined) = switch (n.kind) {
      'COMPLAINT' => (Icons.campaign, Icons.campaign_outlined),
      'RECEIPT' || 'TRANSACTION' => (Icons.receipt_long, Icons.receipt_long_outlined),
      'REMINDER' => (Icons.alarm, Icons.alarm_outlined),
      _ => (Icons.info, Icons.info_outline),
    };
    return Material(
      color: isUnread ? AppColors.primarySoft.withValues(alpha: 0.45) : Colors.white,
      child: InkWell(
        onTap: () => _open(n),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: Gap.lg, vertical: Gap.md),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: const BoxDecoration(color: AppColors.iconBg, shape: BoxShape.circle),
                child: Icon(isUnread ? filled : outlined, size: 20, color: AppColors.primary),
              ),
              const SizedBox(width: Gap.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      n.title,
                      style: TextStyle(fontSize: 14, fontWeight: isUnread ? FontWeight.w800 : FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(n.body, style: const TextStyle(fontSize: 13, height: 1.35)),
                    const SizedBox(height: 4),
                    Muted(relativeTime(n.createdAt)),
                  ],
                ),
              ),
              if (isUnread)
                Container(
                  margin: const EdgeInsets.only(top: 6, left: Gap.sm),
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(color: AppColors.badge, shape: BoxShape.circle),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
