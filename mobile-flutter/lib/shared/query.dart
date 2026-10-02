import 'dart:async';

import 'package:flutter/foundation.dart';

/// Báo cho các màn đang mở rằng dữ liệu theo chủ đề đã đổi (thay cho `invalidateQueries` của react-query).
class RefreshBus extends ChangeNotifier {
  final Map<String, int> _versions = {};

  int version(String topic) => _versions[topic] ?? 0;

  void bump(Iterable<String> topics) {
    for (final t in topics) {
      _versions[t] = version(t) + 1;
    }
    notifyListeners();
  }
}

final refreshBus = RefreshBus();

abstract final class Topics {
  static const charges = 'charges';
  static const profile = 'profile';
  static const complaints = 'complaints';
  static const notifications = 'notifications';
  static const market = 'market';
  static const confirmations = 'confirmations';
}

/// Tải một tài nguyên, tự tải lại khi chủ đề trong [topics] bị bump hoặc theo chu kỳ [poll].
class Query<T> extends ChangeNotifier {
  Query(this._fetch, {this.topics = const [], Duration? poll}) {
    _versions = {for (final t in topics) t: refreshBus.version(t)};
    refreshBus.addListener(_onBus);
    if (poll != null) _timer = Timer.periodic(poll, (_) => refresh(silent: true));
    refresh();
  }

  final Future<T> Function() _fetch;
  final List<String> topics;
  late Map<String, int> _versions;
  Timer? _timer;
  int _seq = 0;
  bool _disposed = false;

  T? data;
  Object? error;
  bool loading = false;

  bool get hasData => data != null;

  Future<void> refresh({bool silent = false}) async {
    final seq = ++_seq;
    if (!silent) {
      loading = true;
      _notify();
    }
    try {
      final result = await _fetch();
      if (seq != _seq) return;
      data = result;
      error = null;
    } catch (e) {
      if (seq != _seq) return;
      // Lỗi khi tải lại ngầm không xóa dữ liệu đang hiện.
      if (!silent || data == null) error = e;
    }
    loading = false;
    _notify();
  }

  void _onBus() {
    var changed = false;
    for (final t in topics) {
      final v = refreshBus.version(t);
      if (_versions[t] != v) {
        _versions[t] = v;
        changed = true;
      }
    }
    if (changed) refresh(silent: true);
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    refreshBus.removeListener(_onBus);
    super.dispose();
  }
}

/// Danh sách phân trang (cuộn vô hạn), bỏ trùng theo [keyOf].
class PagedQuery<T> extends ChangeNotifier {
  PagedQuery(this._fetch, {required this.keyOf, this.topics = const []}) {
    _versions = {for (final t in topics) t: refreshBus.version(t)};
    refreshBus.addListener(_onBus);
    refresh();
  }

  Future<({List<T> items, bool hasMore, int total})> Function(int page) _fetch;
  final Object Function(T) keyOf;
  final List<String> topics;
  late Map<String, int> _versions;
  int _seq = 0;
  int _page = 0;
  bool _disposed = false;

  List<T> items = [];
  int total = 0;
  bool hasMore = false;
  bool loading = false;
  bool loadingMore = false;
  Object? error;

  /// Đổi điều kiện lọc rồi tải lại từ trang đầu.
  void setFetch(Future<({List<T> items, bool hasMore, int total})> Function(int page) fetch) {
    _fetch = fetch;
    items = [];
    refresh();
  }

  Future<void> refresh({bool silent = false}) async {
    final seq = ++_seq;
    if (!silent) {
      loading = true;
      _notify();
    }
    try {
      final r = await _fetch(0);
      if (seq != _seq) return;
      items = _dedupe(r.items);
      hasMore = r.hasMore;
      total = r.total;
      _page = 0;
      error = null;
    } catch (e) {
      if (seq != _seq) return;
      if (!silent || items.isEmpty) error = e;
    }
    loading = false;
    loadingMore = false;
    _notify();
  }

  Future<void> loadMore() async {
    if (!hasMore || loading || loadingMore) return;
    final seq = _seq;
    loadingMore = true;
    _notify();
    try {
      final r = await _fetch(_page + 1);
      if (seq != _seq) return;
      items = _dedupe([...items, ...r.items]);
      hasMore = r.hasMore;
      total = r.total;
      _page++;
    } catch (_) {
      if (seq != _seq) return;
      hasMore = false;
    }
    loadingMore = false;
    _notify();
  }

  /// Sửa một phần tử tại chỗ (vd. bấm lưu tin) mà không tải lại.
  void replaceWhere(bool Function(T) test, T Function(T) update) {
    items = [for (final x in items) test(x) ? update(x) : x];
    _notify();
  }

  void removeWhere(bool Function(T) test) {
    final before = items.length;
    items = [for (final x in items) if (!test(x)) x];
    total -= before - items.length;
    _notify();
  }

  List<T> _dedupe(List<T> list) {
    final seen = <Object>{};
    return [for (final x in list) if (seen.add(keyOf(x))) x];
  }

  void _onBus() {
    var changed = false;
    for (final t in topics) {
      final v = refreshBus.version(t);
      if (_versions[t] != v) {
        _versions[t] = v;
        changed = true;
      }
    }
    if (changed) refresh(silent: true);
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    refreshBus.removeListener(_onBus);
    super.dispose();
  }
}
