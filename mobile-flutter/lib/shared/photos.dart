import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../api/client.dart';
import '../api/models.dart';
import 'theme.dart';
import 'ui.dart';

/// Ảnh từ backend: cần header Bearer (ảnh người dân không công khai) và header bỏ cảnh báo ngrok.
/// Ảnh ở máy chủ khác (vd. Cloudinary của phản ánh) tải không kèm header, để không lộ token cho bên thứ ba.
class AuthImage extends StatelessWidget {
  const AuthImage(this.url, {super.key, this.fit = BoxFit.cover, this.width, this.height, this.placeholder});

  final String url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Widget? placeholder;

  @override
  Widget build(BuildContext context) => Image.network(
        api.resolve(url),
        headers: !url.startsWith('http') || url.startsWith(api.baseUrl) ? api.authHeaders : null,
        fit: fit,
        width: width,
        height: height,
        loadingBuilder: (context, child, progress) => progress == null
            ? child
            : Container(width: width, height: height, color: AppColors.iconBg),
        errorBuilder: (context, error, stack) =>
            placeholder ??
            Container(
              width: width,
              height: height,
              color: AppColors.iconBg,
              alignment: Alignment.center,
              padding: const EdgeInsets.all(4),
              child: const Muted('Không tải được ảnh', size: 10, align: TextAlign.center),
            ),
      );
}

/// Dải ảnh 72px chỉ xem; chạm để phóng to.
class PhotoStrip extends StatelessWidget {
  const PhotoStrip(this.urls, {super.key});

  final List<String> urls;

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 72,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: urls.length,
          separatorBuilder: (_, _) => const SizedBox(width: Gap.sm),
          itemBuilder: (context, i) => GestureDetector(
            onTap: () => showImageViewer(context, urls, i),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(Radii.sm),
              child: AuthImage(urls[i], width: 72, height: 72),
            ),
          ),
        ),
      );
}

/// Xem ảnh toàn màn hình, vuốt ngang để đổi ảnh.
void showImageViewer(BuildContext context, List<String> urls, int initial) {
  Navigator.of(context, rootNavigator: true).push(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (context) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(backgroundColor: Colors.black),
        body: PageView.builder(
          controller: PageController(initialPage: initial),
          itemCount: urls.length,
          itemBuilder: (_, i) => InteractiveViewer(child: Center(child: AuthImage(urls[i], fit: BoxFit.contain))),
        ),
      ),
    ),
  );
}

/// Chọn và tải ảnh lên ngay (tối đa [max] ảnh). [upload] gọi API tải ảnh (ví dụ ảnh chợ).
class PhotoPicker extends StatefulWidget {
  const PhotoPicker({
    super.key,
    required this.photos,
    required this.onChanged,
    required this.upload,
    this.max = 5,
    this.onUploadingChanged,
  });

  final List<UploadedPhoto> photos;
  final ValueChanged<List<UploadedPhoto>> onChanged;
  final Future<UploadedPhoto> Function(String path) upload;
  final int max;
  final ValueChanged<bool>? onUploadingChanged;

  @override
  State<PhotoPicker> createState() => _PhotoPickerState();
}

class _PhotoPickerState extends State<PhotoPicker> {
  int _uploading = 0;
  String? _error;

  Future<void> _pick() async {
    final room = widget.max - widget.photos.length - _uploading;
    if (room <= 0) return;
    final picker = ImagePicker();
    List<XFile> files;
    try {
      files = room == 1
          ? [?await picker.pickImage(source: ImageSource.gallery, imageQuality: 70, maxWidth: 1600)]
          : await picker.pickMultiImage(limit: room, imageQuality: 70, maxWidth: 1600);
    } catch (_) {
      setState(() => _error = 'Không mở được thư viện ảnh.');
      return;
    }
    if (files.isEmpty) return;
    setState(() {
      _error = null;
      _uploading += files.take(room).length;
    });
    widget.onUploadingChanged?.call(true);
    var photos = [...widget.photos];
    for (final f in files.take(room)) {
      try {
        photos = [...photos, await widget.upload(f.path)];
        widget.onChanged(photos);
      } catch (e) {
        if (!mounted) return;
        setState(() {
          _error = e is ApiError && e.code == 'FILE_TOO_LARGE'
              ? 'Ảnh vượt quá 5 MB. Vui lòng chọn ảnh khác.'
              : errorText(e, 'Không tải được ảnh lên. Vui lòng thử lại.');
        });
      } finally {
        if (mounted) setState(() => _uploading--);
      }
    }
    widget.onUploadingChanged?.call(false);
  }

  @override
  Widget build(BuildContext context) {
    final count = widget.photos.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: Gap.sm,
          runSpacing: Gap.sm,
          children: [
            for (final p in widget.photos)
              Stack(
                clipBehavior: Clip.none,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(Radii.sm),
                    child: AuthImage(p.url, width: 72, height: 72),
                  ),
                  Positioned(
                    top: -6,
                    right: -6,
                    child: GestureDetector(
                      onTap: () => widget.onChanged([...widget.photos]..remove(p)),
                      child: Container(
                        width: 22,
                        height: 22,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(color: AppColors.badge, shape: BoxShape.circle),
                        child: const Text('×', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ),
                ],
              ),
            for (var i = 0; i < _uploading; i++)
              Container(
                width: 72,
                height: 72,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: AppColors.iconBg, borderRadius: BorderRadius.circular(Radii.sm)),
                child: const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.primary),
                ),
              ),
            if (count + _uploading < widget.max)
              InkWell(
                onTap: _pick,
                borderRadius: BorderRadius.circular(Radii.sm),
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(Radii.sm),
                    border: Border.all(color: AppColors.primary),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_a_photo_outlined, color: AppColors.primary, size: 22),
                      SizedBox(height: 2),
                      Text('Thêm ảnh', style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        Muted('$count/${widget.max} ảnh · JPEG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh'),
        if (_error != null) ...[const SizedBox(height: 4), ErrorText(_error)],
      ],
    );
  }
}
