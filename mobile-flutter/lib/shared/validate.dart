/// Kiểm tra dữ liệu nhập phía app (trùng câu chữ với app Expo cũ); backend vẫn kiểm tra lại.
library;

import 'dart:math';

/// Chuẩn hóa số điện thoại: bỏ khoảng trắng/dấu, +84 → 0.
String normalizePhone(String raw) {
  final s = raw.replaceAll(RegExp(r'[\s.()-]'), '');
  return s.startsWith('+84') ? '0${s.substring(3)}' : s;
}

String? validatePhone(String raw) {
  final s = normalizePhone(raw);
  if (s.isEmpty) return 'Nhập số điện thoại.';
  if (!RegExp(r'^0\d{9,10}$').hasMatch(s)) {
    return 'Số điện thoại phải có 10 hoặc 11 chữ số, bắt đầu bằng 0 hoặc +84.';
  }
  return null;
}

String? validateOtp(String raw) {
  final s = raw.trim();
  if (s.isEmpty) return 'Nhập mã OTP.';
  if (!RegExp(r'^\d{4,8}$').hasMatch(s)) return 'Mã OTP gồm 4–8 chữ số.';
  return null;
}

String? validateComplaint({required String? category, required String content, required String location}) {
  if (category == null) return 'Chọn loại phản ánh.';
  if (content.trim().isEmpty) return 'Nhập nội dung phản ánh.';
  if (content.trim().length > 4000) return 'Nội dung tối đa 4000 ký tự.';
  if (location.trim().length > 100) return 'Địa điểm tối đa 100 ký tự.';
  return null;
}

const marketCaptionMax = 2500;
const marketCommentMax = 1000;
const marketMaxTags = 4;

String? validateMarketPost({
  required String caption,
  required Set<String> tags,
  required bool sharePhone,
  required String contactPhone,
}) {
  if (caption.trim().isEmpty) return 'Nhập nội dung bài đăng.';
  if (caption.trim().length > marketCaptionMax) return 'Nội dung tối đa $marketCaptionMax ký tự.';
  if (tags.isEmpty) return 'Chọn ít nhất một nhãn.';
  if (tags.length > marketMaxTags) return 'Chọn tối đa $marketMaxTags nhãn.';
  if (sharePhone) return validatePhone(contactPhone);
  return null;
}

final _random = Random.secure();

String _rand8() => _random.nextInt(1 << 32).toRadixString(36).padLeft(7, '0').substring(0, 7);

/// Khóa chống trùng cho thanh toán: `app-<ms base36>-<ngẫu nhiên>`, tối đa 40 ký tự.
String paymentRequestId() {
  final id = 'app-${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}-${_rand8()}${_rand8()}';
  return id.length > 40 ? id.substring(0, 40) : id;
}

/// UUID v4 cho `clientRequestId` của chợ (backend yêu cầu đúng định dạng uuid).
String uuidV4() {
  final b = List<int>.generate(16, (_) => _random.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}
