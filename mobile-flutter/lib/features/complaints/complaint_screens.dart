import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/citizen_api.dart';
import '../../api/client.dart';
import '../../api/models.dart';
import '../../shared/format.dart';
import '../../shared/labels.dart';
import '../../shared/photos.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';
import '../../shared/validate.dart';
import '../home/home_screen.dart' show complaintTag;

class ComplaintsScreen extends StatefulWidget {
  const ComplaintsScreen({super.key});

  @override
  State<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends State<ComplaintsScreen> {
  final _q = Query(citizenApi.complaints, topics: const [Topics.complaints]);

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Phản ánh, kiến nghị')),
        body: QueryView<List<Complaint>>(
          query: _q,
          builder: (context, list) => PageList(
            onRefresh: _q.refresh,
            children: [
              WideButton(
                label: 'Gửi phản ánh mới',
                icon: Icons.add,
                onPressed: () => context.push('/complaints/new'),
              ),
              if (list.isEmpty) const EmptyView('Bạn chưa gửi phản ánh nào.', icon: Icons.campaign_outlined),
              for (final c in list)
                AppCard(
                  onTap: () => context.push('/complaints/${c.id}'),
                  children: [
                    Row(children: [
                      Expanded(child: Bold(label(complaintCategoryLabels, c.category), size: 14)),
                      complaintTag(c),
                    ]),
                    Text(c.summary, maxLines: 2, overflow: TextOverflow.ellipsis),
                    Muted('${c.code} · ${formatDate(c.receivedDate)}'),
                  ],
                ),
            ],
          ),
        ),
      );
}

class NewComplaintScreen extends StatefulWidget {
  const NewComplaintScreen({super.key});

  @override
  State<NewComplaintScreen> createState() => _NewComplaintScreenState();
}

class _NewComplaintScreenState extends State<NewComplaintScreen> {
  final _profile = Query(citizenApi.me, topics: const [Topics.profile]);
  final _location = TextEditingController();
  final _content = TextEditingController();
  String? _category;
  bool _locationEdited = false;
  bool _busy = false;
  bool _uploading = false;
  List<UploadedPhoto> _photos = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    // Mặc định địa điểm là địa chỉ hộ, cho tới khi người dân tự sửa.
    _profile.addListener(() {
      final address = _profile.data?.subject.address;
      if (!_locationEdited && address != null && _location.text.isEmpty) _location.text = address;
    });
  }

  @override
  void dispose() {
    _profile.dispose();
    _location.dispose();
    _content.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final invalid = validateComplaint(category: _category, content: _content.text, location: _location.text);
    if (invalid != null) return setState(() => _error = invalid);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final location = _location.text.trim();
      final created = await citizenApi.submitComplaint(
        category: _category!,
        content: _content.text.trim(),
        location: location.isEmpty ? null : location,
        photoUrls: [for (final p in _photos) p.url],
      );
      refreshBus.bump(const [Topics.complaints, Topics.notifications]);
      if (mounted) context.pushReplacement('/complaints/${created.complaint.id}?fresh=1');
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Gửi không thành công. Vui lòng thử lại.'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Gửi phản ánh')),
        body: ListenableBuilder(
          listenable: _profile,
          builder: (context, _) => PageList(
            bottom: WideButton(
              label: _uploading ? 'Đang tải ảnh…' : 'Gửi phản ánh',
              busy: _busy,
              onPressed: _uploading ? null : _submit,
            ),
            children: [
              AppCard(children: [
                const FieldLabel('Loại phản ánh *'),
                ChipWrap(children: [
                  for (final e in complaintCategoryLabels.entries)
                    PillChip(
                      label: e.value,
                      selected: _category == e.key,
                      onTap: () => setState(() => _category = e.key),
                    ),
                ]),
              ]),
              AppCard(children: [
                const FieldLabel('Địa điểm'),
                TextField(
                  controller: _location,
                  maxLength: 100,
                  onChanged: (_) => _locationEdited = true,
                  decoration: const InputDecoration(hintText: 'Nơi xảy ra sự việc', counterText: ''),
                ),
                const Muted('Mặc định là địa chỉ hộ của bạn; sửa lại nếu sự việc xảy ra ở nơi khác.'),
                const SizedBox(height: Gap.xs),
                const FieldLabel('Mô tả chi tiết *'),
                TextField(
                  controller: _content,
                  minLines: 5,
                  maxLines: 10,
                  maxLength: 4000,
                  decoration: const InputDecoration(hintText: 'Thời điểm, tình trạng thực tế, số lần xảy ra…'),
                ),
              ]),
              AppCard(children: [
                const FieldLabel('Ảnh đính kèm'),
                PhotoPicker(
                  photos: _photos,
                  upload: citizenApi.uploadComplaintPhoto,
                  onChanged: (v) => setState(() => _photos = v),
                  onUploadingChanged: (v) => setState(() => _uploading = v),
                ),
              ]),
              Notice(
                tone: Tone.info,
                icon: Icons.send_outlined,
                title: 'Sẽ gửi tới',
                body: 'UBND xã tiếp nhận và chuyển cho '
                    '${_profile.data?.company?.name ?? 'công ty thu gom phụ trách'} nếu cần. '
                    'Bạn nhận thông báo ở mỗi bước xử lý.',
              ),
              if (_error != null) ErrorText(_error),
            ],
          ),
        ),
      );
}

class ComplaintDetailScreen extends StatefulWidget {
  const ComplaintDetailScreen({super.key, required this.id, this.fresh = false});

  final int id;
  final bool fresh;

  @override
  State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  late final _q = Query(
    () => citizenApi.complaint(widget.id),
    topics: const [Topics.complaints],
    poll: const Duration(seconds: 30),
  );

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Chi tiết phản ánh')),
        body: QueryView<ComplaintDetail>(
          query: _q,
          builder: (context, d) {
            final c = d.complaint;
            return PageList(
              onRefresh: _q.refresh,
              children: [
                if (widget.fresh)
                  Notice(
                    tone: Tone.success,
                    icon: Icons.check_circle,
                    title: 'Đã gửi phản ánh ${c.code}',
                    body: 'UBND xã đã nhận. Bạn sẽ được báo khi xã chuyển xử lý và khi có kết quả.',
                  ),
                AppCard(children: [
                  Row(children: [
                    Expanded(child: Bold(label(complaintCategoryLabels, c.category))),
                    complaintTag(c),
                  ]),
                  Text(c.content, style: const TextStyle(height: 1.4)),
                  Muted([c.code, 'gửi ngày ${formatDate(c.receivedDate)}', ?c.location].join(' · ')),
                  if (c.photoUrls.isNotEmpty) PhotoStrip(c.photoUrls),
                  if (c.forwardedCompanyName != null) InfoRow('Công ty xử lý', c.forwardedCompanyName),
                  if (c.deadline != null) InfoRow('Hạn xử lý', formatDate(c.deadline)),
                  if (c.resolution != null) InfoRow('Kết quả', c.resolution, bold: true),
                ]),
                const SectionTitle('Tiến trình xử lý'),
                AppCard(children: [
                  for (var i = 0; i < d.events.length; i++) _event(d.events[i], last: i == d.events.length - 1),
                ]),
              ],
            );
          },
        ),
      );

  Widget _event(ComplaintEvent e, {required bool last}) => IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 20,
              child: Column(
                children: [
                  const SizedBox(height: 4),
                  Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                  ),
                  if (!last) Expanded(child: Container(width: 2, color: AppColors.border)),
                ],
              ),
            ),
            const SizedBox(width: Gap.sm),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(bottom: last ? 0 : Gap.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Bold(label(complaintEventLabels, e.eventType), size: 14),
                    if (e.content.isNotEmpty) Text(e.content, style: const TextStyle(fontSize: 13, height: 1.35)),
                    Muted('${e.actorLabel} · ${formatDateTime(e.occurredAt)}'),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
}
