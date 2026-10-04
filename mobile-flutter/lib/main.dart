import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

import 'api/client.dart';
import 'app.dart';
import 'auth/session.dart';
import 'shared/unread.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Bản web: đường dẫn thật (/citizen/pay/4) thay vì dạng #, để mã QR của người đi thu mở đúng màn.
  usePathUrlStrategy();
  // Token hết hạn / bị thu hồi: máy chủ trả 401 thì đăng xuất, router tự về màn đăng nhập.
  api.onUnauthorized = session.signOut;
  await session.restore();
  unread; // Khởi tạo bộ đếm thông báo chưa đọc (tự hỏi lại khi đăng nhập / đăng xuất).
  runApp(const CitizenApp());
}
