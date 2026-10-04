import 'dart:async';

import 'package:flutter/foundation.dart';

import '../api/citizen_api.dart';
import '../auth/session.dart';
import 'query.dart';

/// Số thông báo chưa đọc cho huy hiệu tab "Thông báo"; hỏi lại mỗi 30 giây khi đã đăng nhập.
class UnreadCounter extends ChangeNotifier {
  UnreadCounter() {
    session.addListener(_sync);
    refreshBus.addListener(_onBus);
    _sync();
  }

  int value = 0;
  Timer? _timer;
  int _busVersion = 0;

  void _sync() {
    _timer?.cancel();
    _timer = null;
    if (session.signedIn) {
      refresh();
      _timer = Timer.periodic(const Duration(seconds: 30), (_) => refresh());
    } else if (value != 0) {
      value = 0;
      notifyListeners();
    }
  }

  void _onBus() {
    final v = refreshBus.version(Topics.notifications);
    if (v != _busVersion) {
      _busVersion = v;
      refresh();
    }
  }

  Future<void> refresh() async {
    if (!session.signedIn) return;
    try {
      final n = await citizenApi.unreadCount();
      if (n != value) {
        value = n;
        notifyListeners();
      }
    } catch (_) {
      // giữ số cũ khi mất mạng
    }
  }
}

final unread = UnreadCounter();
