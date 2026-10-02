import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/citizen_api.dart';
import '../../auth/session.dart';
import '../../shared/format.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final _profile = Query(citizenApi.me, topics: const [Topics.profile]);

  @override
  void dispose() {
    _profile.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final account = session.account;
    return Scaffold(
      appBar: AppBar(title: const Text('Tài khoản')),
      body: ListenableBuilder(
        listenable: _profile,
        builder: (context, _) {
          final p = _profile.data;
          return PageList(
            onRefresh: _profile.refresh,
            children: [
              Row(
                children: [
                  Avatar(initials(p?.displayName ?? account?.displayName), size: 64),
                  const SizedBox(width: Gap.lg),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Bold(p?.displayName ?? account?.displayName ?? '', size: 18),
                        Muted(p?.phone ?? account?.phone ?? '', size: 13),
                      ],
                    ),
                  ),
                ],
              ),
              if (_profile.error != null && p == null) ErrorBox(error: _profile.error, onRetry: _profile.refresh),
              const SectionTitle('Hộ gia đình'),
              AppCard(children: [
                NavRow(
                  icon: Icons.home_outlined,
                  title: p?.subject.code ?? account?.subjectCode ?? '…',
                  subtitle: p?.subject.address,
                  onTap: () => context.push('/household'),
                ),
                NavRow(
                  icon: Icons.local_shipping_outlined,
                  title: 'Đơn vị thu gom phụ trách',
                  subtitle: p == null
                      ? null
                      : p.company == null
                          ? 'Khu vực chưa có công ty phụ trách'
                          : '${p.company!.name} · ${p.company!.contactPhone}',
                  onTap: () => context.push('/schedule'),
                ),
                NavRow(
                  icon: Icons.campaign_outlined,
                  title: 'Phản ánh, kiến nghị',
                  subtitle: 'Thu chậm, sai mức phí, vấn đề khác',
                  onTap: () => context.push('/complaints'),
                ),
                NavRow(
                  icon: Icons.verified_outlined,
                  title: 'Xác nhận thanh toán',
                  subtitle: 'Các lần đã thanh toán',
                  onTap: () => context.push('/confirmations'),
                ),
              ]),
              const SectionTitle('Ứng dụng'),
              AppCard(children: [
                NavRow(
                  icon: Icons.wifi_tethering,
                  title: 'Kiểm tra kết nối máy chủ',
                  onTap: () => context.push('/connection'),
                ),
              ]),
              WideButton(label: 'Đăng xuất', ghost: true, danger: true, onPressed: session.signOut),
            ],
          );
        },
      ),
    );
  }
}
