import 'labels.dart';

/// "1.234.567 đ" (khoảng trắng không ngắt trước "đ").
String formatMoney(num? value) {
  if (value == null) return '—';
  final negative = value < 0;
  final digits = value.abs().round().toString();
  final buf = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buf.write('.');
    buf.write(digits[i]);
  }
  return '${negative ? '-' : ''}$buf đ';
}

String _two(int n) => n.toString().padLeft(2, '0');

final _dateOnly = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$');

/// Đổi thời điểm của backend sang giờ Việt Nam (UTC+7), không phụ thuộc múi giờ máy.
DateTime? parseVn(String? value) {
  if (value == null || value.isEmpty) return null;
  final m = _dateOnly.firstMatch(value);
  if (m != null) return DateTime.utc(int.parse(m[1]!), int.parse(m[2]!), int.parse(m[3]!));
  final t = DateTime.tryParse(value);
  if (t == null) return null;
  // Chuỗi không có múi giờ coi như đã là giờ Việt Nam.
  final hasZone = RegExp(r'(Z|[+-]\d{2}:?\d{2})$').hasMatch(value);
  if (!hasZone) return DateTime.utc(t.year, t.month, t.day, t.hour, t.minute, t.second);
  return t.toUtc().add(const Duration(hours: 7));
}

/// dd/MM/yyyy, thêm " HH:mm" khi [withTime]. Ngày không hợp lệ trả nguyên chuỗi.
String formatDate(String? value, {bool withTime = false}) {
  if (value == null || value.isEmpty) return '—';
  final t = parseVn(value);
  if (t == null) return value;
  final date = '${_two(t.day)}/${_two(t.month)}/${t.year}';
  return withTime ? '$date ${_two(t.hour)}:${_two(t.minute)}' : date;
}

String formatDateTime(String? value) => formatDate(value, withTime: true);

/// "Vừa xong", "5 phút trước", … như danh sách Chợ Tốt; quá 7 ngày thì hiện ngày.
String relativeTime(String? value, {DateTime? now}) {
  final t = DateTime.tryParse(value ?? '');
  if (t == null) return formatDate(value);
  final diff = (now ?? DateTime.now()).difference(t);
  if (diff.inMinutes < 1) return 'Vừa xong';
  if (diff.inHours < 1) return '${diff.inMinutes} phút trước';
  if (diff.inDays < 1) return '${diff.inHours} giờ trước';
  if (diff.inDays == 1) return 'Hôm qua';
  if (diff.inDays < 7) return '${diff.inDays} ngày trước';
  return formatDate(value);
}

/// Chữ cái đầu của tên đầu và tên cuối, viết hoa ("Nguyễn Văn An" → "NA").
String initials(String? name) {
  final words = (name ?? '').trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
  if (words.isEmpty) return '?';
  final first = words.first.substring(0, 1);
  final last = words.length > 1 ? words.last.substring(0, 1) : '';
  return (first + last).toUpperCase();
}

/// "17:00:00" → "17:00".
String formatTime(String value) => value.length >= 5 ? value.substring(0, 5) : value;

String formatTimeRange(String start, String end) => '${formatTime(start)} – ${formatTime(end)}';

/// "Chủ nhật đầu tháng", "Thứ 2".
String scheduleDayLabel(int weekday, int? weekOfMonth) {
  final day = weekdayLabels[weekday] ?? 'Thứ ?';
  final week = weekOfMonth == null ? null : weekOfMonthLabels[weekOfMonth];
  return week == null ? day : '$day $week';
}

/// yyyy-MM-dd theo giờ máy (ngày mong muốn thu gom).
String isoDate(DateTime d) => '${d.year}-${_two(d.month)}-${_two(d.day)}';

List<DateTime> nextDays(DateTime today, int count) {
  final start = DateTime(today.year, today.month, today.day);
  return [for (var i = 0; i < count; i++) DateTime(start.year, start.month, start.day + i)];
}

const _shortWeekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/// "T7 04/10".
String shortDayLabel(DateTime d) => '${_shortWeekdays[d.weekday % 7]} ${_two(d.day)}/${_two(d.month)}';
