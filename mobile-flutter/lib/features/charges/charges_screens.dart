import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/citizen_api.dart';
import '../../api/models.dart';
import '../../shared/format.dart';
import '../../shared/labels.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';

Tone chargeTone(CitizenCharge c) {
  if (c.status == 'UNPAID') return c.overdue ? Tone.danger : Tone.warning;
  if (c.status == 'PAID') return Tone.success;
  if (c.status == 'EXEMPT') return Tone.info;
  return Tone.neutral;
}

Widget chargeTag(CitizenCharge c) =>
    Tag(c.status == 'UNPAID' && c.overdue ? 'Quá hạn' : label(chargeStatusLabels, c.status), tone: chargeTone(c));

// ---------- Danh sách khoản phí ----------

class ChargesScreen extends StatefulWidget {
  const ChargesScreen({super.key});

  @override
  State<ChargesScreen> createState() => _ChargesScreenState();
}

class _ChargesScreenState extends State<ChargesScreen> {
  final _charges = Query(citizenApi.charges, topics: const [Topics.charges]);

  @override
  void dispose() {
    _charges.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Khoản phí')),
        body: QueryView<List<CitizenCharge>>(
          query: _charges,
          builder: (context, charges) {
            final unpaid = charges.where((c) => c.status == 'UNPAID').toList()
              ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
            final history = charges.where((c) => c.status != 'UNPAID').toList();
            final total = unpaid.fold<int>(0, (s, c) => s + c.remainingAmount);
            return PageList(
              onRefresh: _charges.refresh,
              children: [
                const SectionTitle('Cần đóng'),
                if (unpaid.isEmpty)
                  const AppCard(children: [Muted('Hộ không có khoản nào cần đóng.', size: 14)]),
                for (final c in unpaid) _UnpaidCard(c),
                if (unpaid.length > 1)
                  AppCard(
                    color: AppColors.primarySoft,
                    borderColor: AppColors.primarySoft,
                    children: [InfoRow('Tổng còn phải đóng', formatMoney(total), bold: true)],
                  ),
                const SectionTitle('Lịch sử'),
                if (history.isEmpty)
                  const AppCard(children: [Muted('Chưa có kỳ nào đã đóng.', size: 14)])
                else
                  AppCard(children: [
                    for (var i = 0; i < history.length; i++) ...[
                      if (i > 0) const Divider(),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Bold(history[i].periodLabel, size: 14),
                                Muted(
                                  '${history[i].feeTypeName}'
                                  '${history[i].paidAt == null ? '' : ' · ${formatDate(history[i].paidAt)}'}',
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Bold(formatMoney(history[i].status == 'EXEMPT' ? 0 : history[i].amount), size: 14),
                              const SizedBox(height: 2),
                              chargeTag(history[i]),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ]),
              ],
            );
          },
        ),
      );
}

class _UnpaidCard extends StatelessWidget {
  const _UnpaidCard(this.c);

  final CitizenCharge c;

  @override
  Widget build(BuildContext context) => AppCard(children: [
        Row(children: [Expanded(child: Bold(c.periodLabel)), chargeTag(c)]),
        Text(
          formatMoney(c.remainingAmount),
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: c.overdue ? AppColors.danger : AppColors.primaryDark,
          ),
        ),
        Muted('${c.feeTypeName} · hạn đóng ${formatDate(c.dueDate)}', size: 13),
        const Divider(),
        InfoRow('Số tiền cần đóng', formatMoney(c.remainingAmount), bold: true),
        InfoRow('Mã khoản', c.code),
        WideButton(label: 'Chuyển khoản VietQR', onPressed: () => context.push('/pay/${c.id}')),
      ]);
}

// ---------- Chuyển khoản VietQR ----------

/// Hộ chỉ đóng tiền mặt cho người đi thu hoặc chuyển khoản qua mã VietQR của công ty: app không tự ghi thanh toán, chỉ
/// hiện mã và chờ ngân hàng báo về.
class PayScreen extends StatefulWidget {
  const PayScreen({super.key, required this.chargeId});

  final int chargeId;

  @override
  State<PayScreen> createState() => _PayScreenState();
}

class _PayScreenState extends State<PayScreen> {
  // Hỏi lại 3 giây một lần: hộ chuyển khoản bằng app ngân hàng, SePay báo về máy chủ thì màn này tự thấy khoản đã đóng.
  late final _charge = Query(() => citizenApi.charge(widget.chargeId),
      topics: const [Topics.charges], poll: const Duration(seconds: 3));
  late final _transfer = Query(() => citizenApi.transferInfo(widget.chargeId));
  bool _wasPayable = false;

  @override
  void initState() {
    super.initState();
    _charge.addListener(_onCharge);
    _transfer.addListener(_onTransfer);
  }

  @override
  void dispose() {
    _charge.removeListener(_onCharge);
    _transfer.removeListener(_onTransfer);
    _charge.dispose();
    _transfer.dispose();
    super.dispose();
  }

  void _onTransfer() {
    if (mounted) setState(() {});
  }

  /// Khoản vừa chuyển từ chưa đóng sang đã đóng khi đang mở màn (ngân hàng báo về): sang danh sách xác nhận thanh toán.
  void _onCharge() {
    final c = _charge.data;
    if (c == null || !mounted) return;
    final payable = c.status == 'UNPAID' && c.remainingAmount > 0;
    if (_wasPayable && c.status == 'PAID') {
      _wasPayable = false;
      refreshBus.bump(const [Topics.confirmations, Topics.notifications]);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã nhận chuyển khoản. Khoản phí đã đóng.')));
      context.pushReplacement('/confirmations');
      return;
    }
    _wasPayable = payable;
  }

  Widget _qrCard(TransferInfo t) => AppCard(children: [
        const Bold('Quét mã để chuyển khoản'),
        Center(
          child: Image.network(
            t.qrImageUrl,
            width: 240,
            height: 240,
            fit: BoxFit.contain,
            semanticLabel: 'Mã QR chuyển khoản',
            errorBuilder: (_, _, _) => const Padding(
              padding: EdgeInsets.all(Gap.lg),
              child: Muted('Không tải được mã QR. Bạn vẫn chuyển khoản được theo thông tin bên dưới.'),
            ),
          ),
        ),
        _InfoRow('Ngân hàng', t.bankName),
        _InfoRow('Số tài khoản', t.bankAccount),
        _InfoRow('Chủ tài khoản', t.accountHolder),
        _InfoRow('Số tiền', formatMoney(t.amount)),
        _InfoRow('Nội dung', t.code),
      ]);

  Widget _chargeCard(CitizenCharge c) => AppCard(children: [
        Row(children: [Expanded(child: Bold(c.periodLabel)), chargeTag(c)]),
        Muted('${c.feeTypeName} · ${c.code}', size: 13),
        const Muted('Cần thanh toán'),
        Text(
          formatMoney(c.remainingAmount),
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.primaryDark),
        ),
      ]);

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Chuyển khoản VietQR')),
        body: QueryView<CitizenCharge>(
          query: _charge,
          builder: (context, c) {
            final payable = c.status == 'UNPAID' && c.remainingAmount > 0;
            final transfer = _transfer.data;
            if (!payable) {
              return PageList(
                bottom: const WideButton(label: 'Khoản này đã đóng', ghost: true, onPressed: null),
                children: [_chargeCard(c)],
              );
            }
            return PageList(
              children: [
                _chargeCard(c),
                // Chuyển khoản thật qua VietQR vào tài khoản công ty; ngân hàng báo về thì hệ thống tự xác nhận.
                if (transfer != null && transfer.configured) ...[
                  _qrCard(transfer),
                  const Notice(
                    tone: Tone.info,
                    icon: Icons.hourglass_top,
                    title: 'Đang chờ chuyển khoản',
                    body: 'Mở app ngân hàng, quét mã và giữ nguyên số tiền, nội dung. Ngân hàng báo về là khoản tự chuyển '
                        'sang đã đóng, bạn không cần bấm gì thêm. Tiền vào tài khoản của công ty thu gom.',
                  ),
                ] else if (transfer != null || _transfer.error != null)
                  const Notice(
                    tone: Tone.warning,
                    icon: Icons.info_outline,
                    title: 'Chưa chuyển khoản được',
                    body: 'Công ty thu gom chưa có tài khoản nhận chuyển khoản. Vui lòng đóng tiền mặt cho người đi thu '
                        'khi họ đến thu.',
                  )
                else
                  const Center(child: Padding(padding: EdgeInsets.all(Gap.lg), child: CircularProgressIndicator())),
              ],
            );
          },
        ),
      );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 110, child: Muted(label)),
            Expanded(child: SelectableText(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
          ],
        ),
      );
}

// ---------- Xác nhận thanh toán ----------

class ConfirmationsScreen extends StatefulWidget {
  const ConfirmationsScreen({super.key});

  @override
  State<ConfirmationsScreen> createState() => _ConfirmationsScreenState();
}

class _ConfirmationsScreenState extends State<ConfirmationsScreen> {
  final _list = Query(citizenApi.confirmations, topics: const [Topics.confirmations]);

  @override
  void dispose() {
    _list.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Xác nhận thanh toán')),
        body: QueryView<List<PaymentConfirmation>>(
          query: _list,
          builder: (context, list) => PageList(
            onRefresh: _list.refresh,
            children: [
              if (list.isEmpty) const EmptyView('Hộ chưa có lần thanh toán nào.', icon: Icons.receipt_long),
              for (final p in list)
                AppCard(
                  onTap: () => context.push('/confirmations/${p.id}'),
                  children: [
                    Row(children: [
                      Expanded(child: Bold('${p.feeTypeName} · ${p.periodLabel}', size: 14)),
                      Tag(
                        label(paymentMethodLabels, p.method),
                        tone: p.method == 'APP_SIMULATED' ? Tone.info : Tone.success,
                      ),
                    ]),
                    Bold(formatMoney(p.amount), size: 18, color: AppColors.primaryDark),
                    Muted('${p.code} · ${formatDateTime(p.paidAt)}'),
                  ],
                ),
            ],
          ),
        ),
      );
}

class ConfirmationScreen extends StatefulWidget {
  const ConfirmationScreen({super.key, required this.id, this.fresh = false});

  final int id;
  final bool fresh;

  @override
  State<ConfirmationScreen> createState() => _ConfirmationScreenState();
}

class _ConfirmationScreenState extends State<ConfirmationScreen> {
  late final _q = Query(() => citizenApi.confirmation(widget.id));

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Xác nhận thanh toán')),
        body: QueryView<PaymentConfirmation>(
          query: _q,
          builder: (context, p) => PageList(
            children: [
              if (widget.fresh)
                Notice(
                  tone: Tone.success,
                  icon: Icons.check_circle,
                  title: 'Thanh toán thành công',
                  body: '${p.feeTypeName} ${p.periodLabel} · ${formatMoney(p.amount)}',
                ),
              AppCard(children: [
                const Bold('Xác nhận thanh toán'),
                InfoRow('Mã xác nhận', p.code, bold: true),
                InfoRow('Số tiền', formatMoney(p.amount), bold: true),
                InfoRow('Thời điểm', formatDateTime(p.paidAt)),
                InfoRow('Hình thức', label(paymentMethodLabels, p.method)),
                InfoRow('Khoản', '${p.feeTypeName} · ${p.periodLabel}'),
                InfoRow('Mã khoản', p.chargeCode),
                InfoRow('Trạng thái khoản', p.chargeStatus == 'PAID' ? 'Đã đóng đủ' : 'Còn thiếu'),
              ]),
              AppCard(children: [
                const Bold('Hộ nộp'),
                InfoRow('Hộ', '${p.subjectName} (${p.subjectCode})'),
                InfoRow('Địa chỉ', p.subjectAddress),
                InfoRow('Công ty thu gom', p.companyName),
              ]),
              const Muted(
                'Đây là xác nhận của ứng dụng cho khoản đã ghi nhận trên hệ thống, không thay thế chứng từ do '
                'đơn vị bán dịch vụ phát hành.',
                align: TextAlign.center,
              ),
              if (widget.fresh) WideButton(label: 'Về trang chủ', onPressed: () => context.go('/home')),
            ],
          ),
        ),
      );
}
