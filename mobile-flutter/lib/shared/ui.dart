import 'package:flutter/material.dart';

import '../api/client.dart';
import 'query.dart';
import 'theme.dart';

/// Các thành phần giao diện dùng chung (tương đương `mobile/src/shared/ui.tsx`).

enum Tone { neutral, success, warning, danger, info }

({Color bg, Color fg}) toneColors(Tone tone) => switch (tone) {
      Tone.neutral => (bg: AppColors.iconBg, fg: AppColors.textMuted),
      Tone.success => (bg: AppColors.primarySoft, fg: AppColors.primaryDark),
      Tone.warning => (bg: AppColors.warningSoft, fg: AppColors.warning),
      Tone.danger => (bg: AppColors.dangerSoft, fg: AppColors.danger),
      Tone.info => (bg: AppColors.infoSoft, fg: AppColors.info),
    };

class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.children, this.onTap, this.color, this.borderColor, this.padding});

  final List<Widget> children;
  final VoidCallback? onTap;
  final Color? color;
  final Color? borderColor;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    final content = Padding(
      padding: padding ?? const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const SizedBox(height: Gap.sm),
            children[i],
          ],
        ],
      ),
    );
    return Material(
      color: color ?? AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Radii.md),
        side: BorderSide(color: borderColor ?? AppColors.cardBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: onTap == null ? content : InkWell(onTap: onTap, child: content),
    );
  }
}

class Tag extends StatelessWidget {
  const Tag(this.text, {super.key, this.tone = Tone.neutral});

  final String text;
  final Tone tone;

  @override
  Widget build(BuildContext context) {
    final c = toneColors(tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: c.bg, borderRadius: BorderRadius.circular(Radii.pill)),
      child: Text(text, style: TextStyle(color: c.fg, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}

class Muted extends StatelessWidget {
  const Muted(this.text, {super.key, this.size = 12, this.align, this.maxLines});

  final String text;
  final double size;
  final TextAlign? align;
  final int? maxLines;

  @override
  Widget build(BuildContext context) => Text(
        text,
        textAlign: align,
        maxLines: maxLines,
        overflow: maxLines == null ? null : TextOverflow.ellipsis,
        style: TextStyle(color: AppColors.textMuted, fontSize: size, height: 1.35),
      );
}

class Bold extends StatelessWidget {
  const Bold(this.text, {super.key, this.size = 15, this.color = AppColors.text, this.maxLines});

  final String text;
  final double size;
  final Color color;
  final int? maxLines;

  @override
  Widget build(BuildContext context) => Text(
        text,
        maxLines: maxLines,
        overflow: maxLines == null ? null : TextOverflow.ellipsis,
        style: TextStyle(fontSize: size, fontWeight: FontWeight.w700, color: color, height: 1.3),
      );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: Gap.sm, bottom: 2, left: 2),
        child: Row(
          children: [
            Expanded(
              child: Text(
                text.toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMuted,
                  letterSpacing: 0.4,
                ),
              ),
            ),
            ?trailing,
          ],
        ),
      );
}

/// Dòng "nhãn — giá trị" trong thẻ chi tiết.
class InfoRow extends StatelessWidget {
  const InfoRow(this.label, this.value, {super.key, this.bold = false, this.trailing});

  final String label;
  final String? value;
  final bool bold;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(flex: 2, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 13))),
          const SizedBox(width: Gap.md),
          Expanded(
            flex: 3,
            child: trailing != null
                ? Align(alignment: Alignment.centerRight, child: trailing)
                : Text(
                    value ?? '—',
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.text,
                      fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
                    ),
                  ),
          ),
        ],
      );
}

class NavRow extends StatelessWidget {
  const NavRow({super.key, required this.icon, required this.title, this.subtitle, this.onTap});

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(Radii.sm),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: const BoxDecoration(color: AppColors.iconBg, shape: BoxShape.circle),
                child: Icon(icon, size: 20, color: AppColors.primary),
              ),
              const SizedBox(width: Gap.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    if (subtitle != null) Muted(subtitle!),
                  ],
                ),
              ),
              if (onTap != null) const Text('›', style: TextStyle(fontSize: 22, color: AppColors.textMuted)),
            ],
          ),
        ),
      );
}

/// Chip chọn dạng viên thuốc; chọn thì nền xanh đậm chữ trắng.
class PillChip extends StatelessWidget {
  const PillChip({super.key, required this.label, required this.selected, required this.onTap, this.icon});

  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Material(
        color: selected ? AppColors.chrome : Colors.white,
        shape: StadiumBorder(side: BorderSide(color: selected ? AppColors.chrome : AppColors.border)),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 15, color: selected ? Colors.white : AppColors.textMuted),
                  const SizedBox(width: 4),
                ],
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : AppColors.text,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class ChipWrap extends StatelessWidget {
  const ChipWrap({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Wrap(spacing: Gap.sm, runSpacing: Gap.sm, children: children);
}

/// Thẻ thông báo màu nhạt theo tông (cảnh báo, thành công…).
class Notice extends StatelessWidget {
  const Notice({super.key, this.title, required this.body, this.tone = Tone.info, this.icon});

  final String? title;
  final String body;
  final Tone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = toneColors(tone);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: c.bg, borderRadius: BorderRadius.circular(Radii.md)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[Icon(icon, color: c.fg, size: 22), const SizedBox(width: Gap.md)],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(title!, style: TextStyle(color: c.fg, fontWeight: FontWeight.w800, fontSize: 14)),
                  ),
                Text(body, style: TextStyle(color: c.fg, fontSize: 13, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 2),
        child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
      );
}

class ErrorText extends StatelessWidget {
  const ErrorText(this.text, {super.key});

  final String? text;

  @override
  Widget build(BuildContext context) => text == null
      ? const SizedBox.shrink()
      : Text(text!, style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600));
}

class Avatar extends StatelessWidget {
  const Avatar(this.text, {super.key, this.size = 48, this.light = false});

  final String text;
  final double size;
  final bool light;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: light ? Colors.white.withValues(alpha: 0.18) : AppColors.primarySoft,
          shape: BoxShape.circle,
          border: light ? Border.all(color: Colors.white.withValues(alpha: 0.5)) : null,
        ),
        child: Text(
          text,
          style: TextStyle(
            color: light ? Colors.white : AppColors.primaryDark,
            fontWeight: FontWeight.w800,
            fontSize: size * 0.36,
          ),
        ),
      );
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppColors.primary),
            SizedBox(height: Gap.md),
            Muted('Đang tải…', size: 13),
          ],
        ),
      );
}

class ErrorBox extends StatelessWidget {
  const ErrorBox({super.key, required this.error, this.onRetry});

  final Object? error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => AppCard(
        color: AppColors.dangerSoft,
        borderColor: AppColors.dangerSoft,
        children: [
          Text(
            errorText(error, 'Có lỗi xảy ra. Vui lòng thử lại.'),
            style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600),
          ),
          if (onRetry != null) OutlinedButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      );
}

class EmptyView extends StatelessWidget {
  const EmptyView(this.text, {super.key, this.icon = Icons.inbox_outlined});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
        child: Column(
          children: [
            Icon(icon, size: 44, color: AppColors.border),
            const SizedBox(height: Gap.sm),
            Muted(text, size: 14, align: TextAlign.center),
          ],
        ),
      );
}

/// Trang cuộn có kéo-để-tải-lại, padding 16, khoảng cách 12 giữa các khối.
class PageList extends StatelessWidget {
  const PageList({super.key, required this.children, this.onRefresh, this.bottom});

  final List<Widget> children;
  final Future<void> Function()? onRefresh;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    final list = ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.lg, Gap.lg, Gap.xl * 2),
      itemCount: children.length,
      separatorBuilder: (_, _) => const SizedBox(height: Gap.md),
      itemBuilder: (_, i) => children[i],
    );
    final body = onRefresh == null
        ? list
        : RefreshIndicator(color: AppColors.primary, onRefresh: onRefresh!, child: list);
    if (bottom == null) return body;
    return Column(
      children: [
        Expanded(child: body),
        SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(Gap.lg, Gap.sm, Gap.lg, Gap.sm),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: bottom,
          ),
        ),
      ],
    );
  }
}

/// Hiện loading / lỗi / dữ liệu của một [Query].
class QueryView<T> extends StatelessWidget {
  const QueryView({super.key, required this.query, required this.builder});

  final Query<T> query;
  final Widget Function(BuildContext context, T data) builder;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: query,
        builder: (context, _) {
          final data = query.data;
          if (data != null) return builder(context, data);
          if (query.error != null) {
            return PageList(children: [ErrorBox(error: query.error, onRetry: query.refresh)]);
          }
          return const Center(child: LoadingView());
        },
      );
}

/// Nút lớn chiếm cả chiều ngang, hiện vòng xoay khi đang gửi.
class WideButton extends StatelessWidget {
  const WideButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.ghost = false,
    this.danger = false,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final bool ghost;
  final bool danger;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final child = busy
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2.4, color: ghost ? AppColors.primary : Colors.white),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 6)],
              Flexible(child: Text(label, textAlign: TextAlign.center)),
            ],
          );
    final action = busy ? null : onPressed;
    final Widget button;
    if (ghost) {
      button = OutlinedButton(
        onPressed: action,
        style: danger
            ? OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: const BorderSide(color: AppColors.danger),
              )
            : null,
        child: child,
      );
    } else {
      button = FilledButton(
        onPressed: action,
        style: danger ? FilledButton.styleFrom(backgroundColor: AppColors.danger) : null,
        child: child,
      );
    }
    return SizedBox(width: double.infinity, child: button);
  }
}

void showSnack(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));
}

Future<bool> confirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  String cancelLabel = 'Để sau',
  bool danger = false,
}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: Text(cancelLabel)),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          style: TextButton.styleFrom(foregroundColor: danger ? AppColors.danger : AppColors.primary),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return ok ?? false;
}
