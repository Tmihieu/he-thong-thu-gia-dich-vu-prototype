import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../api/citizen_api.dart';
import '../../api/client.dart';
import '../../auth/session.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';
import '../../shared/validate.dart';

/// Đăng nhập bằng số điện thoại + OTP (bản demo: OTP mô phỏng, máy chủ báo mã trong thông điệp).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Điền sẵn tài khoản demo cho người chấm thử.
  final _phone = TextEditingController(text: '0902000128');
  final _otp = TextEditingController();
  String? _sentTo;
  String? _notice;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final invalid = validatePhone(_phone.text);
    if (invalid != null) return setState(() => _error = invalid);
    final phone = normalizePhone(_phone.text);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final message = await citizenApi.requestOtp(phone);
      setState(() {
        _sentTo = phone;
        _notice = message;
        _otp.text = '';
      });
    } catch (e) {
      setState(() => _error = errorText(e, 'Có lỗi xảy ra. Vui lòng thử lại.'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final invalid = validateOtp(_otp.text);
    if (invalid != null) return setState(() => _error = invalid);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await session.signIn(await citizenApi.verifyOtp(_sentTo!, _otp.text.trim()));
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Có lỗi xảy ra. Vui lòng thử lại.'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final otpStep = _sentTo != null;
    return Scaffold(
      backgroundColor: AppColors.chrome,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Gap.xl),
            child: Column(
              children: [
                ClipOval(child: Image.asset('assets/logo-dong-thanh.jpg', width: 96, height: 96, fit: BoxFit.cover)),
                const SizedBox(height: Gap.lg),
                const Text(
                  'Thu giá dịch vụ VSMT',
                  style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                const Text('Xã Đông Thạnh · ứng dụng người dân', style: TextStyle(color: AppColors.heroText)),
                const SizedBox(height: Gap.xl),
                AppCard(
                  padding: const EdgeInsets.all(Gap.lg),
                  children: otpStep
                      ? [
                          const Bold('Nhập mã OTP', size: 18),
                          if (_notice != null) Notice(body: _notice!, tone: Tone.info),
                          Muted('Số điện thoại: $_sentTo', size: 13),
                          TextField(
                            controller: _otp,
                            autofocus: true,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            maxLength: 8,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            style: const TextStyle(fontSize: 22, letterSpacing: 8, fontWeight: FontWeight.w700),
                            decoration: const InputDecoration(counterText: '', hintText: '••••••'),
                            onSubmitted: (_) => _verify(),
                          ),
                          ErrorText(_error),
                          WideButton(label: 'Đăng nhập', busy: _busy, onPressed: _verify),
                          TextButton(
                            onPressed: _busy
                                ? null
                                : () => setState(() {
                                      _sentTo = null;
                                      _notice = null;
                                      _error = null;
                                    }),
                            child: const Text('Đổi số điện thoại'),
                          ),
                        ]
                      : [
                          const Bold('Đăng nhập', size: 18),
                          const Muted('Nhập số điện thoại đã đăng ký với UBND xã.', size: 13),
                          TextField(
                            controller: _phone,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              hintText: 'Số điện thoại',
                              prefixIcon: Icon(Icons.phone_iphone),
                            ),
                            onSubmitted: (_) => _requestOtp(),
                          ),
                          ErrorText(_error),
                          WideButton(label: 'Nhận mã OTP', busy: _busy, onPressed: _requestOtp),
                        ],
                ),
                const SizedBox(height: Gap.lg),
                TextButton(
                  onPressed: () => context.push('/connection'),
                  style: TextButton.styleFrom(foregroundColor: AppColors.heroText),
                  child: const Text('Kiểm tra kết nối máy chủ'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
