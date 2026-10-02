import 'package:flutter/material.dart';

import 'api/client.dart';
import 'app.dart';
import 'auth/session.dart';
import 'shared/unread.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Token hết hạn / bị thu hồi: máy chủ trả 401 thì đăng xuất, router tự về màn đăng nhập.
  api.onUnauthorized = session.signOut;
  await session.restore();
  unread; // Khởi tạo bộ đếm thông báo chưa đọc (tự hỏi lại khi đăng nhập / đăng xuất).
  runApp(const CitizenApp());
}
