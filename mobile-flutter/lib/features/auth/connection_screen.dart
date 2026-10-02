import 'package:flutter/material.dart';

import '../../api/client.dart';
import '../../shared/theme.dart' show Gap;
import '../../shared/ui.dart';

/// Kiểm tra app có gọi được backend không (đọc `/v3/api-docs`).
class ConnectionScreen extends StatefulWidget {
  const ConnectionScreen({super.key});

  @override
  State<ConnectionScreen> createState() => _ConnectionScreenState();
}

class _ConnectionScreenState extends State<ConnectionScreen> {
  bool _checking = true;
  String? _error;
  ({String title, String version, int paths, int ms})? _result;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    setState(() {
      _checking = true;
      _error = null;
      _result = null;
    });
    final watch = Stopwatch()..start();
    try {
      final doc = await api.get('/v3/api-docs') as Map<String, dynamic>;
      final info = (doc['info'] as Map?) ?? const {};
      setState(() => _result = (
            title: '${info['title'] ?? 'API'}',
            version: '${info['version'] ?? '?'}',
            paths: ((doc['paths'] as Map?) ?? const {}).length,
            ms: watch.elapsedMilliseconds,
          ));
    } catch (e) {
      setState(() => _error = errorText(e, 'Máy chủ trả lỗi không mong đợi. Vui lòng thử lại.'));
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = _result;
    return Scaffold(
      appBar: AppBar(title: const Text('Kết nối máy chủ')),
      body: PageList(
        children: [
          AppCard(children: [
            const Muted('Địa chỉ máy chủ'),
            SelectableText(api.baseUrl, style: const TextStyle(fontWeight: FontWeight.w700)),
          ]),
          if (_checking)
            const AppCard(children: [Row(children: [
              SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
              SizedBox(width: Gap.md),
              Text('Đang kiểm tra…'),
            ])])
          else if (_error != null)
            Notice(
              tone: Tone.danger,
              icon: Icons.cloud_off,
              title: 'Không kết nối được',
              body: '$_error\nĐiện thoại và máy chủ cần cùng mạng, hoặc máy chủ phải mở ra Internet (ngrok).',
            )
          else if (r != null)
            Notice(
              tone: Tone.success,
              icon: Icons.check_circle,
              title: 'Kết nối thành công',
              body: '${r.title} · phiên bản ${r.version}\n${r.paths} endpoint · phản hồi sau ${r.ms} ms',
            ),
          WideButton(label: 'Kiểm tra lại', ghost: true, busy: _checking, onPressed: _check),
          const Muted('Địa chỉ máy chủ được gắn lúc build APK (--dart-define=API_URL=…).',
              align: TextAlign.center),
        ],
      ),
    );
  }
}
