import 'package:flutter_test/flutter_test.dart';
import 'package:vsmt_citizen/api/models.dart';
import 'package:vsmt_citizen/app.dart';
import 'package:vsmt_citizen/features/notifications/links.dart';
import 'package:vsmt_citizen/shared/format.dart';
import 'package:vsmt_citizen/shared/validate.dart';

void main() {
  group('format', () {
    test('formatMoney dùng dấu chấm ngăn nghìn', () {
      expect(formatMoney(1250000), startsWith('1.250.000'));
      expect(formatMoney(null), '—');
    });

    test('relativeTime theo kiểu Chợ Tốt', () {
      final now = DateTime.parse('2026-10-03T10:00:00Z');
      expect(relativeTime('2026-10-03T09:59:30Z', now: now), 'Vừa xong');
      expect(relativeTime('2026-10-03T09:45:00Z', now: now), '15 phút trước');
      expect(relativeTime('2026-10-03T07:00:00Z', now: now), '3 giờ trước');
      expect(relativeTime('2026-10-02T09:00:00Z', now: now), 'Hôm qua');
      expect(relativeTime('2026-09-30T10:00:00Z', now: now), '3 ngày trước');
    });

    test('initials lấy chữ đầu tên đầu và tên cuối', () {
      expect(initials('Nguyễn Văn An'), 'NA');
      expect(initials('  '), '?');
    });
  });

  group('validate', () {
    test('số điện thoại', () {
      expect(normalizePhone('+84 902.000.128'), '0902000128');
      expect(validatePhone('0902000128'), isNull);
      expect(validatePhone('12ab'), isNotNull);
      expect(validatePhone(''), 'Nhập số điện thoại.');
    });

    test('bài chợ', () {
      expect(validateMarketPost(caption: 'Cho tủ lạnh cũ', tags: {'GIVE'}, sharePhone: false, contactPhone: ''),
          isNull);
      expect(validateMarketPost(caption: ' ', tags: {'GIVE'}, sharePhone: false, contactPhone: ''), isNotNull);
      expect(validateMarketPost(caption: 'a', tags: {}, sharePhone: false, contactPhone: ''), isNotNull);
      expect(
        validateMarketPost(
          caption: 'a',
          tags: {'SELL', 'GIVE', 'FIND', 'EXCHANGE', 'X'},
          sharePhone: false,
          contactPhone: '',
        ),
        isNotNull,
      );
      expect(validateMarketPost(caption: 'a', tags: {'GIVE'}, sharePhone: true, contactPhone: ''), isNotNull);
    });

    test('uuidV4 đúng định dạng và không trùng', () {
      final re = RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
      final a = uuidV4();
      expect(re.hasMatch(a), isTrue, reason: a);
      expect(uuidV4(), isNot(a));
    });

    test('paymentRequestId tối đa 40 ký tự', () {
      expect(paymentRequestId().length, lessThanOrEqualTo(40));
    });
  });

  group('notificationRoute', () {
    NotificationLink link(String screen, Map<String, Object?> params) =>
        NotificationLink(screen: screen, params: params);

    test('trỏ tới đúng màn', () {
      expect(notificationRoute(link('citizen.complaintDetail', {'complaintId': 7})), '/complaints/7');
      expect(notificationRoute(link('citizen.paymentConfirmation', {'paymentId': 3})), '/confirmations/3');
      expect(notificationRoute(link('citizen.marketDetail', {'postId': 12})), '/posts/12');
      expect(notificationRoute(link('citizen.marketDetail', {})), '/market');
      expect(notificationRoute(link('citizen.unknown', {'id': 1})), isNull);
      expect(notificationRoute(null), isNull);
    });
  });

  group('authRedirect', () {
    test('chưa đăng nhập thì về /login, trừ màn kiểm tra kết nối', () {
      expect(authRedirect(false, '/home'), '/login');
      expect(authRedirect(false, '/posts/3'), '/login');
      expect(authRedirect(false, '/connection'), isNull);
      expect(authRedirect(false, '/login'), isNull);
    });

    test('đã đăng nhập thì rời /login', () {
      expect(authRedirect(true, '/login'), '/home');
      expect(authRedirect(true, '/market'), isNull);
    });
  });

  group('MarketPost.fromJson', () {
    test('đọc tác giả, tổ, kiểm duyệt và tiêu đề từ dòng đầu', () {
      final p = MarketPost.fromJson({
        'id': 5,
        'code': 'CHO-0005',
        'caption': 'Tủ lạnh Sanyo 150L\nCòn chạy tốt',
        'tags': ['SELL'],
        'category': 'HOUSEHOLD',
        'area': {'id': 1, 'name': 'Tổ 3'},
        'author': {'citizenId': 9, 'displayName': 'Trần Thị Bình'},
        'photoUrls': [],
        'status': 'OPEN',
        'moderation': 'PENDING_REVIEW',
        'moderationNote': 'Chờ cán bộ xã duyệt',
        'createdAt': '2026-10-03T08:00:00Z',
        'version': 2,
      });
      expect(p.title, 'Tủ lạnh Sanyo 150L');
      expect(p.areaName, 'Tổ 3');
      expect(p.authorId, 9);
      expect(p.moderation, 'PENDING_REVIEW');
      expect(p.closed, isFalse);
      expect(p.version, 2);
    });

    test('moderation mặc định PUBLISHED, caption rỗng thì tiêu đề là mã tin', () {
      final p = MarketPost.fromJson({'id': 1, 'code': 'CHO-1', 'caption': '', 'status': 'CLOSED'});
      expect(p.moderation, 'PUBLISHED');
      expect(p.title, 'CHO-1');
      expect(p.closed, isTrue);
    });
  });
}
