import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/citizen_api.dart';
import '../../api/client.dart';
import '../../api/models.dart';
import '../../shared/format.dart';
import '../../shared/labels.dart';
import '../../shared/query.dart';
import '../../shared/theme.dart';
import '../../shared/ui.dart';
import '../../shared/validate.dart';

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
        InfoRow('Số tiền khoản', formatMoney(c.amount)),
        if (c.paidAmount > 0) InfoRow('Đã thu tại nhà', formatMoney(c.paidAmount)),
        InfoRow('Còn phải đóng', formatMoney(c.remainingAmount), bold: true),
        InfoRow('Mã khoản', c.code),
        WideButton(label: 'Thanh toán (mô phỏng)', onPressed: () => context.push('/pay/${c.id}')),
      ]);
}

// ---------- Thanh toán mô phỏng ----------

/// Khóa chống trùng giữ theo khoản cho tới khi thanh toán xong, để bấm lại sau lỗi mạng không ghi hai lần.
final _pendingRequestIds = <int, String>{};

class PayScreen extends StatefulWidget {
  const PayScreen({super.key, required this.chargeId});

  final int chargeId;

  @override
  State<PayScreen> createState() => _PayScreenState();
}

class _PayScreenState extends State<PayScreen> {
  late final _charge = Query(() => citizenApi.charge(widget.chargeId), topics: const [Topics.charges]);
  int _method = 0;
  bool _busy = false;
  String? _error;

  static const _methods = [
    (Icons.qr_code_2, 'Quét QR chuyển khoản', 'Vào tài khoản của công ty thu gom'),
    (Icons.account_balance_wallet_outlined, 'Ví điện tử', 'MoMo, Viettel Money, ZaloPay'),
    (Icons.credit_card, 'Ngân hàng liên kết', 'Thẻ nội địa, Internet Banking'),
  ];

  @override
  void dispose() {
    _charge.dispose();
    super.dispose();
  }

  Future<void> _pay(CitizenCharge c) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final requestId = _pendingRequestIds.putIfAbsent(c.id, paymentRequestId);
    try {
      final confirmation = await citizenApi.pay(c.id, c.remainingAmount, requestId);
      _pendingRequestIds.remove(c.id);
      refreshBus.bump(const [Topics.charges, Topics.confirmations, Topics.notifications]);
      if (mounted) context.pushReplacement('/confirmations/${confirmation.id}?fresh=1');
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Thanh toán không thành công. Vui lòng thử lại.'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Thanh toán')),
        body: QueryView<CitizenCharge>(
          query: _charge,
          builder: (context, c) {
            final payable = c.status == 'UNPAID' && c.remainingAmount > 0;
            return PageList(
              bottom: payable
                  ? WideButton(
                      label: 'Xác nhận thanh toán ${formatMoney(c.remainingAmount)}',
                      busy: _busy,
                      onPressed: () => _pay(c),
                    )
                  : const WideButton(label: 'Khoản này đã đóng', ghost: true, onPressed: null),
              children: [
                AppCard(children: [
                  Row(children: [Expanded(child: Bold(c.periodLabel)), chargeTag(c)]),
                  Muted('${c.feeTypeName} · ${c.code}', size: 13),
                  const Muted('Cần thanh toán'),
                  Text(
                    formatMoney(c.remainingAmount),
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.primaryDark),
                  ),
                ]),
                AppCard(children: [
                  const Bold('Phương thức thanh toán'),
                  RadioGroup<int>(
                    groupValue: _method,
                    onChanged: (v) => setState(() => _method = v ?? 0),
                    child: Column(
                      children: [
                        for (var i = 0; i < _methods.length; i++)
                          InkWell(
                            onTap: () => setState(() => _method = i),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  Icon(_methods[i].$1, color: AppColors.primary),
                                  const SizedBox(width: Gap.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Bold(_methods[i].$2, size: 14),
                                        Muted(_methods[i].$3),
                                      ],
                                    ),
                                  ),
                                  Radio<int>(value: i, activeColor: AppColors.primary),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ]),
                const Notice(
                  tone: Tone.warning,
                  icon: Icons.info_outline,
                  title: 'Đây là cổng thanh toán mô phỏng',
                  body: 'Bản demo không chuyển tiền thật. Bấm xác nhận thì khoản được ghi là đã đóng và công ty, '
                      'UBND xã thấy ngay. Ứng dụng phát "Xác nhận thanh toán", không phải biên lai pháp lý.',
                ),
                if (_error != null) ErrorText(_error),
              ],
            );
          },
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
