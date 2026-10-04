import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/citizen_api.dart';
import '../../api/models.dart';
import '../../shared/format.dart';
import '../../shared/labels.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _profile = Query(citizenApi.me, topics: const [Topics.profile]);
  final _charges = Query(citizenApi.charges, topics: const [Topics.charges]);
  final _complaints = Query(citizenApi.complaints, topics: const [Topics.complaints]);

  @override
  void dispose() {
    for (final q in [_profile, _charges, _complaints]) {
      q.dispose();
    }
    super.dispose();
  }

  Future<void> _refresh() =>
      Future.wait([_profile.refresh(), _charges.refresh(), _complaints.refresh()]);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListenableBuilder(
        listenable: Listenable.merge([_profile, _charges, _complaints]),
        builder: (context, _) => RefreshIndicator(
          color: AppColors.primary,
          onRefresh: _refresh,
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              _hero(context),
              Padding(
                padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.lg, Gap.lg, Gap.xl * 2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _shortcuts(context),
                    const SizedBox(height: Gap.md),
                    const SectionTitle('Việc của bạn'),
                    const SizedBox(height: Gap.sm),
                    ..._tasks(context),
                    TextButton(
                      onPressed: () => context.push('/complaints'),
                      child: const Text('Xem tất cả phản ánh của bạn ›'),
                    ),
                    if (_profile.data?.company case final company?) ...[
                      const SectionTitle('Đơn vị thu gom'),
                      const SizedBox(height: Gap.sm),
                      AppCard(
                        onTap: () => context.push('/schedule'),
                        children: [
                          Bold(company.name),
                          Muted('Đầu mối: ${company.contactName} · ${company.contactPhone}', size: 13),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _hero(BuildContext context) {
    final p = _profile.data;
    final top = MediaQuery.paddingOf(context).top;
    return Container(
      color: AppColors.chrome,
      padding: EdgeInsets.fromLTRB(Gap.lg, top + Gap.lg, Gap.lg, Gap.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Avatar(initials(p?.displayName), size: 48, light: true),
              const SizedBox(width: Gap.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Xin chào', style: TextStyle(color: AppColors.heroText, fontSize: 13)),
                    Text(
                      p?.displayName ?? '…',
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    if (p != null)
                      Text(
                        '${p.subject.code} · ${p.subject.areaName}, ${p.subject.districtName}',
                        style: const TextStyle(color: AppColors.heroText, fontSize: 12),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: Gap.lg),
          _payCta(context),
        ],
      ),
    );
  }

  Widget _payCta(BuildContext context) {
    final charges = _charges.data;
    Widget body;
    VoidCallback? onTap;
    if (charges == null) {
      body = Text(
        _charges.error != null ? 'Không tải được khoản phí' : 'Đang tải khoản phí…',
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
      );
      onTap = _charges.error != null ? _charges.refresh : null;
    } else {
      final unpaid = charges.where((c) => c.status == 'UNPAID').toList()..sort((a, b) => a.dueDate.compareTo(b.dueDate));
      if (unpaid.isEmpty) {
        onTap = () => context.push('/charges');
        body = const Row(
          children: [
            Expanded(
              child: Text('Không có khoản nào cần đóng',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
            ),
            Text('Xem ›', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ],
        );
      } else {
        final total = unpaid.fold<int>(0, (s, c) => s + c.remainingAmount);
        final first = unpaid.first;
        onTap = () => context.push(unpaid.length == 1 ? '/pay/${first.id}' : '/charges');
        body = Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Phí ${first.periodLabel} · ${formatMoney(total)}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${unpaid.length} khoản · hạn ${formatDate(first.dueDate)}',
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Radii.pill)),
              child: const Text('Thanh toán ›',
                  style: TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w800, fontSize: 13)),
            ),
          ],
        );
      }
    }
    return Material(
      color: AppColors.accent,
      borderRadius: BorderRadius.circular(Radii.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(Radii.md),
        onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(14), child: body),
      ),
    );
  }

  Widget _shortcuts(BuildContext context) {
    final items = <(IconData, String, VoidCallback)>[
      (Icons.receipt_long, 'Khoản phí\nphải đóng', () => context.push('/charges')),
      (Icons.campaign_outlined, 'Gửi phản ánh\nkiến nghị', () => context.push('/complaints/new')),
      (Icons.storefront_outlined, 'Chợ\nđồ cũ', () => context.go('/market')),
      (Icons.event_note_outlined, 'Lịch\nthu gom', () => context.push('/schedule')),
      (Icons.verified_outlined, 'Xác nhận\nthanh toán', () => context.push('/confirmations')),
    ];
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: Gap.md, horizontal: Gap.sm),
      children: [
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.15,
          children: [
            for (final (icon, text, onTap) in items)
              InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(Radii.sm),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: const BoxDecoration(color: AppColors.primarySoft, shape: BoxShape.circle),
                      child: Icon(icon, color: AppColors.primary),
                    ),
                    const SizedBox(height: 6),
                    Text(text,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, height: 1.25)),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }

  List<Widget> _tasks(BuildContext context) {
    final tasks = <Widget>[];
    final overdue = (_charges.data ?? const <CitizenCharge>[]).where((c) => c.status == 'UNPAID' && c.overdue).toList();
    if (overdue.isNotEmpty) {
      tasks.add(AppCard(
        onTap: () => context.push('/charges'),
        children: [
          Row(children: [
            const Expanded(child: Bold('Khoản phí quá hạn')),
            Tag('${overdue.length} khoản', tone: Tone.danger),
          ]),
          const Muted('Vui lòng thanh toán sớm để công ty không phải đến thu tại nhà nhiều lần.', size: 13),
        ],
      ));
    }
    final complaints = _complaints.data ?? const <Complaint>[];
    if (complaints.isNotEmpty && complaints.first.status != 'RESOLVED') {
      final c = complaints.first;
      tasks.add(AppCard(
        onTap: () => context.push('/complaints/${c.id}'),
        children: [
          Row(children: [
            Expanded(child: Bold(label(complaintCategoryLabels, c.category))),
            complaintTag(c),
          ]),
          Muted(c.summary, size: 13, maxLines: 2),
          Muted('${c.code} · ${formatDate(c.receivedDate)}'),
        ],
      ));
    }
    if (tasks.isEmpty) {
      tasks.add(const AppCard(children: [
        Bold('Không có việc cần xử lý'),
        Muted('Phản ánh đang xử lý sẽ hiện ở đây.', size: 13),
      ]));
    }
    return [
      for (var i = 0; i < tasks.length; i++) ...[if (i > 0) const SizedBox(height: Gap.md), tasks[i]],
    ];
  }
}

/// Nhãn trạng thái phản ánh, "Quá hạn xử lý" khi quá hạn mà chưa giải quyết.
Widget complaintTag(Complaint c) {
  if (c.status == 'RESOLVED') return Tag(label(complaintStatusLabels, c.status), tone: Tone.success);
  if (c.overdue) return const Tag('Quá hạn xử lý', tone: Tone.danger);
  return Tag(label(complaintStatusLabels, c.status), tone: c.status == 'PROCESSING' ? Tone.info : Tone.warning);
}
