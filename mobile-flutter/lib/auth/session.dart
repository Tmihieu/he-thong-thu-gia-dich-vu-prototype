import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/client.dart';
import '../api/models.dart';

/// Phiên đăng nhập của người dân, lưu trong secure storage (Keystore) như app Expo cũ.
class SessionStore extends ChangeNotifier {
  SessionStore({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'vsmt.citizen.session';

  final FlutterSecureStorage _storage;
  LoginResult? _session;
  bool _restored = false;

  LoginResult? get current => _session;
  CitizenAccount? get account => _session?.account;
  bool get signedIn => _session != null;
  bool get restored => _restored;

  /// Đọc phiên đã lưu; phiên hết hạn hoặc hỏng thì bỏ.
  Future<void> restore() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw != null) {
        final saved = LoginResult.fromJson(jsonDecode(raw) as Json);
        final expires = DateTime.tryParse(saved.expiresAt);
        if (expires != null && expires.isAfter(DateTime.now())) {
          _apply(saved);
        } else {
          await _storage.delete(key: _key);
        }
      }
    } catch (_) {
      await _storage.delete(key: _key);
    }
    _restored = true;
    notifyListeners();
  }

  Future<void> signIn(LoginResult result) async {
    _apply(result);
    await _storage.write(key: _key, value: jsonEncode(result.toJson()));
    notifyListeners();
  }

  Future<void> signOut() async {
    if (_session == null) return;
    _session = null;
    api.token = null;
    notifyListeners();
    await _storage.delete(key: _key);
  }

  void _apply(LoginResult result) {
    _session = result;
    api.token = result.accessToken;
  }
}

final session = SessionStore();
