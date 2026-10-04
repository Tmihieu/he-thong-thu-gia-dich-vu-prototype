import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/citizen_api.dart';
import '../../api/client.dart';
import '../../api/market_api.dart';
import '../../api/models.dart';
import '../../shared/labels.dart';
import '../../shared/photos.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';
import '../../shared/validate.dart';
import 'market_common.dart';

/// Đăng bài mới (không có [id]) hoặc sửa bài của mình. Bài khớp bộ lọc từ khóa sẽ chờ cán bộ xã duyệt.
class PostFormScreen extends StatefulWidget {
  const PostFormScreen({super.key, this.id});

  final int? id;

  @override
  State<PostFormScreen> createState() => _PostFormScreenState();
}

class _PostFormScreenState extends State<PostFormScreen> {
  final _profile = Query(citizenApi.me, topics: const [Topics.profile]);
  final _caption = TextEditingController();
  final _phone = TextEditingController();
  Set<String> _tags = {};
  String _category = 'OTHER';
  List<UploadedPhoto> _photos = [];
  bool _sharePhone = false;
  int? _version;
  bool _loading = false;
  Object? _loadError;
  bool _uploading = false;
  bool _busy = false;
  bool _conflict = false;
  String? _error;
  // Một mã cho mỗi lần soạn: bấm lại sau lỗi mạng không tạo bài trùng.
  final _requestId = uuidV4();

  bool get _editing => widget.id != null;

  @override
  void initState() {
    super.initState();
    _profile.addListener(_prefillPhone);
    if (_editing) _load();
  }

  void _prefillPhone() {
    final phone = _profile.data?.phone;
    if (!_editing && phone != null && _phone.text.isEmpty) _phone.text = phone;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final e = await marketApi.edit(widget.id!);
      if (!mounted) return;
      setState(() {
        _caption.text = e.post.caption;
        _tags = {...e.post.tags};
        _category = e.post.category;
        _photos = [for (final i in e.images) UploadedPhoto(name: '${i.id}', url: i.previewUrl)];
        _sharePhone = e.sharePhone;
        _phone.text = e.contactPhone ?? _profile.data?.phone ?? '';
        _version = e.version;
        _conflict = false;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() => _loadError = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _profile.dispose();
    _caption.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final invalid = validateMarketPost(
      caption: _caption.text,
      tags: _tags,
      sharePhone: _sharePhone,
      contactPhone: _phone.text,
    );
    if (invalid != null) return setState(() => _error = invalid);
    setState(() {
      _busy = true;
      _error = null;
    });
    final body = <String, Object?>{
      'caption': _caption.text.trim(),
      'tags': _tags.toList(),
      'category': _category,
      'photoIds': [for (final p in _photos) int.parse(p.name)],
      'sharePhone': _sharePhone,
      if (_sharePhone) 'contactPhone': normalizePhone(_phone.text),
    };
    try {
      final MarketPost saved;
      if (_editing) {
        saved = await marketApi.update(widget.id!, {...body, 'version': _version});
      } else {
        saved = await marketApi.create({...body, 'clientRequestId': _requestId});
      }
      refreshBus.bump(const [Topics.market]);
      if (!mounted) return;
      if (saved.moderation == 'PENDING_REVIEW') {
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Bài đang chờ duyệt', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            content: Text(saved.moderationNote ??
                'Nội dung có từ ngữ cần cán bộ xã kiểm tra. Bài sẽ hiện trong chợ sau khi được duyệt.'),
            actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Đã hiểu'))],
          ),
        );
        if (!mounted) return;
      } else {
        showSnack(context, _editing ? 'Đã lưu thay đổi.' : 'Đã đăng bài.');
      }
      if (_editing) {
        context.pop();
      } else {
        context.pushReplacement('/posts/${saved.id}');
      }
    } on ApiError catch (e) {
      if (!mounted) return;
      setState(() {
        if (e.status == 409 && _editing) {
          _conflict = true;
          _error = 'Bài vừa được thay đổi ở nơi khác. Tải lại bản mới rồi sửa tiếp (nội dung đang nhập sẽ được thay).';
        } else {
          _error = errorText(e, 'Lưu không thành công. Vui lòng thử lại.');
        }
      });
    } catch (e) {
      if (mounted) setState(() => _error = 'Lưu không thành công. Vui lòng thử lại.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _editing ? 'Sửa bài đăng' : 'Đăng bài mới';
    if (_editing && _version == null) {
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: _loading || _loadError == null
            ? const Center(child: LoadingView())
            : PageList(children: [ErrorBox(error: _loadError, onRetry: _load)]),
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListenableBuilder(
        listenable: _profile,
        builder: (context, _) => PageList(
          bottom: WideButton(
            label: _uploading ? 'Đang tải ảnh…' : (_editing ? 'Lưu thay đổi' : 'Đăng bài'),
            busy: _busy,
            onPressed: _uploading ? null : _submit,
          ),
          children: [
            AppCard(children: [
              const FieldLabel('Nội dung *'),
              ListenableBuilder(
                listenable: _caption,
                builder: (context, _) => TextField(
                  controller: _caption,
                  minLines: 5,
                  maxLines: 12,
                  maxLength: marketCaptionMax,
                  decoration: InputDecoration(
                    hintText: 'Mô tả món đồ, tình trạng, cách nhận… Không cần ghi địa chỉ nhà.',
                    counterText: '${_caption.text.length}/$marketCaptionMax',
                  ),
                ),
              ),
              const Muted('Dòng đầu tiên sẽ là tiêu đề hiện trong danh sách.'),
            ]),
            AppCard(children: [
              const FieldLabel('Ảnh'),
              PhotoPicker(
                photos: _photos,
                upload: marketApi.uploadImage,
                onChanged: (p) => setState(() => _photos = p),
                onUploadingChanged: (v) => setState(() => _uploading = v),
              ),
            ]),
            AppCard(children: [
              const FieldLabel('Nhãn * (chọn 1–4)'),
              ChipWrap(children: [
                for (final e in marketTagLabels.entries)
                  PillChip(
                    label: e.value,
                    selected: _tags.contains(e.key),
                    onTap: () => setState(() {
                      if (!_tags.remove(e.key) && _tags.length < marketMaxTags) _tags.add(e.key);
                    }),
                  ),
              ]),
              const SizedBox(height: Gap.sm),
              const FieldLabel('Danh mục'),
              ChipWrap(children: [
                for (final c in marketCategories)
                  PillChip(
                    label: label(marketCategoryLabels, c),
                    icon: categoryIcon(c),
                    selected: _category == c,
                    onTap: () => setState(() => _category = c),
                  ),
              ]),
              const SizedBox(height: Gap.sm),
              InfoRow('Tổ', _profile.data?.subject.areaName ?? '…'),
              const Muted('Bài hiện theo tổ của hộ bạn, không hiện địa chỉ nhà.'),
            ]),
            AppCard(children: [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _sharePhone,
                activeThumbColor: AppColors.primary,
                onChanged: (v) => setState(() => _sharePhone = v),
                title: const Text('Chia sẻ số điện thoại để người khác gọi',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ),
              if (_sharePhone)
                TextField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  maxLength: 20,
                  decoration: const InputDecoration(labelText: 'Số liên hệ', counterText: ''),
                )
              else
                const Muted('Tắt: không ai thấy số của bạn; người khác liên hệ qua bình luận.'),
            ]),
            if (!_editing)
              const Notice(
                tone: Tone.info,
                icon: Icons.verified_user_outlined,
                title: 'Kiểm duyệt trước khi đăng',
                body: 'Bài có từ ngữ cần kiểm tra sẽ chờ cán bộ xã duyệt trước khi hiện trong chợ.',
              ),
            if (_error != null) ErrorText(_error),
            if (_conflict) WideButton(label: 'Tải lại bài', ghost: true, icon: Icons.refresh, onPressed: _load),
          ],
        ),
      ),
    );
  }
}
