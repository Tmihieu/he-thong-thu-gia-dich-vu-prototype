import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

/// Địa chỉ backend, truyền lúc build: `--dart-define=API_URL=http://192.168.1.10:8080`.
/// Không truyền: bản web (đóng gói vào web quản trị ở /citizen, xem `build:citizen` trong web/package.json) chạy cùng
/// origin nên gọi /api qua proxy của nginx / Vite; trên điện thoại là đường ngrok của bản demo.
const String _envApiUrl = String.fromEnvironment('API_URL');
final String kDefaultApiUrl = _envApiUrl.isNotEmpty
    ? _envApiUrl
    : (kIsWeb ? Uri.base.origin : 'https://outer-chasing-headlock.ngrok-free.dev');

/// Lỗi `{code, message}` của backend (message tiếng Việt, hiện thẳng cho người dùng).
class ApiError implements Exception {
  const ApiError(this.status, this.code, this.message);

  final int status;
  final String code;
  final String message;

  @override
  String toString() => 'ApiError($status, $code, $message)';
}

/// Câu lỗi để hiện: lỗi backend dùng message của backend, lỗi khác dùng câu dự phòng.
String errorText(Object? error, String fallback) => error is ApiError ? error.message : fallback;

/// Wrapper HTTP cùng quy ước với app Expo cũ (`mobile/src/api/client.ts`): gắn Bearer token, đổi lỗi thành
/// [ApiError], gặp 401 khi đang có token thì gọi [onUnauthorized] để đăng xuất.
class ApiClient {
  ApiClient({String? baseUrl, http.Client? client})
      : _baseUrl = baseUrl ?? kDefaultApiUrl,
        _client = client ?? http.Client();

  final http.Client _client;
  String _baseUrl;
  String? token;
  void Function()? onUnauthorized;

  static const requestTimeout = Duration(seconds: 30);
  static const uploadTimeout = Duration(seconds: 60);

  String get baseUrl => _baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
  set baseUrl(String value) => _baseUrl = value;

  /// Header cho ảnh cần đăng nhập (`Image.network`) và cho mọi request.
  /// `ngrok-skip-browser-warning` bỏ trang cảnh báo của ngrok bản miễn phí.
  Map<String, String> get authHeaders => {
        'ngrok-skip-browser-warning': '1',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  /// URL tuyệt đối cho đường dẫn tương đối của backend (vd. ảnh `/api/citizen/photos/...`).
  String resolve(String path) => path.startsWith('http') ? path : baseUrl + path;

  Uri _uri(String path, Map<String, Object?>? params) {
    final root = baseUrl;
    if (root.isEmpty) {
      throw const ApiError(0, 'API_URL_MISSING', 'Chưa cấu hình địa chỉ máy chủ (API_URL).');
    }
    final uri = Uri.parse(root + path);
    final query = <String, String>{
      for (final e in (params ?? const <String, Object?>{}).entries)
        if (e.value != null && e.value.toString().isNotEmpty) e.key: e.value.toString(),
    };
    return query.isEmpty ? uri : uri.replace(queryParameters: query);
  }

  ApiError _networkError() =>
      ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ $baseUrl. Vui lòng kiểm tra mạng.');

  Future<dynamic> get(String path, {Map<String, Object?>? params}) => send('GET', path, params: params);
  Future<dynamic> post(String path, [Object? body]) => send('POST', path, body: body);
  Future<dynamic> put(String path, [Object? body]) => send('PUT', path, body: body);
  Future<dynamic> patch(String path, [Object? body]) => send('PATCH', path, body: body);
  Future<dynamic> delete(String path) => send('DELETE', path);

  Future<dynamic> send(String method, String path, {Map<String, Object?>? params, Object? body}) async {
    final uri = _uri(path, params);
    final sentToken = token;
    final request = http.Request(method, uri)
      ..headers.addAll({'Accept': 'application/json', ...authHeaders});
    if (body != null) {
      request.headers['Content-Type'] = 'application/json; charset=utf-8';
      request.body = jsonEncode(body);
    }
    http.Response res;
    try {
      res = await http.Response.fromStream(await _client.send(request).timeout(requestTimeout));
    } on TimeoutException {
      throw _networkError();
    } on SocketException {
      throw _networkError();
    } on http.ClientException {
      throw _networkError();
    } on HandshakeException {
      throw _networkError();
    }
    return _decode(res, sentToken);
  }

  /// POST multipart một tệp ảnh (trường `file`); backend nhận dạng ảnh theo nội dung.
  Future<dynamic> upload(String path, String filePath) async {
    final uri = _uri(path, null);
    final sentToken = token;
    final request = http.MultipartRequest('POST', uri)
      ..headers.addAll({'Accept': 'application/json', ...authHeaders})
      ..files.add(await http.MultipartFile.fromPath('file', filePath));
    http.Response res;
    try {
      res = await http.Response.fromStream(await _client.send(request).timeout(uploadTimeout));
    } on TimeoutException {
      throw _networkError();
    } on SocketException {
      throw _networkError();
    } on http.ClientException {
      throw _networkError();
    }
    return _decode(res, sentToken);
  }

  dynamic _decode(http.Response res, String? sentToken) {
    // Đọc UTF-8 theo byte: thiếu charset thì `res.body` hiểu nhầm là Latin-1 và hỏng chữ tiếng Việt.
    final text = utf8.decode(res.bodyBytes, allowMalformed: true);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      if (res.statusCode == 401 && sentToken != null) onUnauthorized?.call();
      throw _toApiError(res.statusCode, text);
    }
    if (res.statusCode == 204 || text.isEmpty) return null;
    try {
      return jsonDecode(text);
    } on FormatException {
      throw _toApiError(res.statusCode, '');
    }
  }

  static ApiError _toApiError(int status, String text) {
    try {
      final data = jsonDecode(text);
      if (data is Map && data['code'] != null && data['message'] != null) {
        return ApiError(status, '${data['code']}', '${data['message']}');
      }
    } on FormatException {
      // thân lỗi không phải JSON (vd. trang lỗi của proxy)
    }
    return ApiError(status, 'HTTP_$status', 'Máy chủ trả lỗi không mong đợi. Vui lòng thử lại.');
  }
}

/// Client dùng chung của app.
final api = ApiClient();
