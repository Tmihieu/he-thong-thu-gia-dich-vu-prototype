import '../../api/models.dart';

/// Đường dẫn trong app cho liên kết của thông báo; null nếu thông báo không trỏ tới đâu.
String? notificationRoute(NotificationLink? link) {
  if (link == null) return null;
  final p = link.params;
  String? id(String key) {
    final v = p[key];
    return v == null || '$v'.isEmpty ? null : '$v';
  }

  switch (link.screen) {
    case 'citizen.complaintDetail':
      final c = id('complaintId');
      return c == null ? '/complaints' : '/complaints/$c';
    case 'citizen.paymentConfirmation':
      final c = id('paymentId');
      return c == null ? '/confirmations' : '/confirmations/$c';
    case 'citizen.marketDetail':
      final c = id('postId');
      return c == null ? '/market' : '/posts/$c';
    default:
      return null;
  }
}
