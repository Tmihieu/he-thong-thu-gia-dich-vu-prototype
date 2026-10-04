import 'package:flutter/material.dart';

/// Bảng màu xanh lá của app người dân (giữ nguyên `mobile/src/shared/theme.ts`).
abstract final class AppColors {
  static const primary = Color(0xFF127A43);
  static const primaryDark = Color(0xFF0B4D2C);
  static const primarySoft = Color(0xFFE3F3EA);
  static const accent = Color(0xFF2BB673);
  static const chrome = Color(0xFF0F6236);
  static const heroText = Color(0xFFD9EFE2);
  static const background = Color(0xFFF3F5F3);
  static const surface = Colors.white;
  static const iconBg = Color(0xFFEEF2EF);
  static const cardBorder = Color(0xFFE9EEEA);
  static const text = Color(0xFF1C2B23);
  static const textMuted = Color(0xFF6B7A72);
  static const border = Color(0xFFE2E8E4);
  static const badge = Color(0xFFE0342C);
  static const danger = Color(0xFFC0392B);
  static const dangerSoft = Color(0xFFFDECEA);
  static const warning = Color(0xFF8A5A00);
  static const warningSoft = Color(0xFFFFF6E5);
  static const info = Color(0xFF2B6CB0);
  static const infoSoft = Color(0xFFE6F0FB);

  /// Màu giá / nhãn "Bán đồ" kiểu Chợ Tốt.
  static const sell = Color(0xFFD0471B);
}

abstract final class Gap {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
}

abstract final class Radii {
  static const sm = 8.0;
  static const md = 14.0;
  static const lg = 22.0;
  static const pill = 999.0;
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    primary: AppColors.primary,
    surface: AppColors.surface,
    error: AppColors.danger,
  );
  const pill = StadiumBorder();
  const buttonPadding = EdgeInsets.symmetric(horizontal: 18, vertical: 14);
  const buttonText = TextStyle(fontSize: 15, fontWeight: FontWeight.w700);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.background,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.chrome,
      foregroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
    ),
    textTheme: const TextTheme(
      bodyMedium: TextStyle(color: AppColors.text, fontSize: 14),
      bodySmall: TextStyle(color: AppColors.textMuted, fontSize: 12),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.5),
        disabledForegroundColor: Colors.white,
        shape: pill,
        padding: buttonPadding,
        textStyle: buttonText,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primary,
        side: const BorderSide(color: AppColors.primary),
        shape: pill,
        padding: buttonPadding,
        textStyle: buttonText,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: AppColors.primary, textStyle: buttonText),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      hintStyle: const TextStyle(color: AppColors.textMuted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Radii.sm),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Radii.sm),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Radii.sm),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: AppColors.primarySoft,
      height: 64,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: s.contains(WidgetState.selected) ? AppColors.primary : AppColors.textMuted,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(color: s.contains(WidgetState.selected) ? AppColors.primary : AppColors.textMuted),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    dividerTheme: const DividerThemeData(color: AppColors.border, space: 1, thickness: 1),
  );
}
