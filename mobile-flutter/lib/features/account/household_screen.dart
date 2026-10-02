import 'package:flutter/material.dart';

import '../../api/citizen_api.dart';
import '../../api/models.dart';
import '../../auth/session.dart';
import '../../shared/format.dart';
import '../../shared/labels.dart';
import '../../shared/query.dart';
import '../../shared/ui.dart';

class HouseholdScreen extends StatefulWidget {
  const HouseholdScreen({super.key});

  @override
  State<HouseholdScreen> createState() => _HouseholdScreenState();
}

class _HouseholdScreenState extends State<HouseholdScreen> {
  final _profile = Query(citizenApi.me, topics: const [Topics.profile]);

  @override
  void dispose() {
    _profile.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Thông tin hộ')),
        body: QueryView<CitizenProfile>(
          query: _profile,
          builder: (context, p) {
            final s = p.subject;
            final contract = p.contract;
            final company = p.company;
            return PageList(
              onRefresh: _profile.refresh,
              children: [
                AppCard(children: [
                  const Bold('Hộ'),
                  InfoRow('Mã hộ', s.code, bold: true),
                  InfoRow('Tên hộ', s.name),
                  InfoRow('Loại', label(subjectTypeLabels, s.subjectType)),
                  InfoRow('Địa chỉ', s.address),
                  InfoRow('Tổ/Ấp/Thôn', '${s.areaName} (${s.areaCode}) · ${s.districtName}'),
                  if (s.memberCount != null) InfoRow('Số nhân khẩu', '${s.memberCount}'),
                  InfoRow('SĐT của hộ', s.phone),
                  InfoRow(
                    'Tình trạng',
                    null,
                    trailing: Tag(
                      label(subjectStatusLabels, s.status),
                      tone: switch (s.status) {
                        'ACTIVE' => Tone.success,
                        'PENDING' => Tone.warning,
                        _ => Tone.neutral,
                      },
                    ),
                  ),
                ]),
                AppCard(children: [
                  const Bold('Đăng ký dịch vụ'),
                  if (contract == null)
                    const Muted('Hộ chưa có đăng ký dịch vụ đang hiệu lực. Liên hệ UBND xã để được hướng dẫn.', size: 13)
                  else ...[
                    InfoRow('Số đăng ký', contract.contractNo),
                    InfoRow('Nhóm giá', label(tariffGroupLabels, contract.tariffGroup)),
                    InfoRow('Hiệu lực từ', formatDate(contract.validFrom)),
                    if (contract.validTo != null) InfoRow('Đến', formatDate(contract.validTo)),
                    if (contract.exempt)
                      InfoRow('Miễn 100%', null, trailing: Tag(contract.exemptReason ?? 'Được miễn', tone: Tone.info)),
                  ],
                ]),
                AppCard(children: [
                  const Bold('Đơn vị thu gom'),
                  if (company == null)
                    const Muted('Khu vực của hộ chưa được phân công công ty thu gom.', size: 13)
                  else ...[
                    InfoRow('Công ty', company.name),
                    InfoRow('Đầu mối', company.contactName),
                    InfoRow('Điện thoại', company.contactPhone),
                  ],
                ]),
                AppCard(children: [
                  const Bold('Tài khoản ứng dụng'),
                  InfoRow('Tên hiển thị', p.displayName),
                  InfoRow('Số điện thoại đăng nhập', session.account?.phone ?? p.phone),
                ]),
                const Muted('Thông tin chưa đúng? Liên hệ UBND xã; cán bộ xã xác minh trước khi thay đổi.',
                    align: TextAlign.center),
              ],
            );
          },
        ),
      );
}
