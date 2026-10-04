import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/citizen_api.dart';
import '../../api/models.dart';
import '../../shared/format.dart';
import '../../shared/labels.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  final _q = Query(citizenApi.schedule, topics: const [Topics.profile]);

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Lịch thu gom')),
        body: QueryView<CitizenSchedule>(
          query: _q,
          builder: (context, s) => PageList(
            onRefresh: _q.refresh,
            children: [
              AppCard(children: [
                Row(children: [
                  Expanded(child: Bold('${s.areaName} · ${s.districtName}')),
                  const Tag('Đang áp dụng', tone: Tone.success),
                ]),
                Muted(
                  s.company == null
                      ? 'Tổ chưa được phân công công ty thu gom.'
                      : '${s.company!.name} · ${s.company!.contactName} · ${s.company!.contactPhone}',
                  size: 13,
                ),
              ]),
              if (s.lines.isEmpty)
                const EmptyView('Chưa có lịch thu gom cho tổ này.', icon: Icons.event_busy)
              else
                AppCard(children: [
                  for (var i = 0; i < s.lines.length; i++) ...[
                    if (i > 0) const Divider(),
                    _line(s.lines[i]),
                  ],
                ]),
              WideButton(
                label: 'Báo thu gom sai lịch',
                ghost: true,
                onPressed: () => context.push('/complaints/new'),
              ),
            ],
          ),
        ),
      );

  Widget _line(ScheduleLine l) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: const BoxDecoration(color: AppColors.primarySoft, shape: BoxShape.circle),
            child: const Icon(Icons.delete_outline, size: 20, color: AppColors.primary),
          ),
          const SizedBox(width: Gap.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Bold(scheduleDayLabel(l.weekday, l.weekOfMonth), size: 14),
                Muted([label(wasteTypeLabels, l.wasteType), ?l.note].join(' · ')),
              ],
            ),
          ),
          Text(formatTimeRange(l.startTime, l.endTime),
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primaryDark)),
        ],
      );
}
