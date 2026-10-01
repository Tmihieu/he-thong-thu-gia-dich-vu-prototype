/**
 * Điền sẵn tài khoản người dân demo (docs/demo-accounts.md) để người trình diễn bấm là vào.
 * Tắt bằng EXPO_PUBLIC_DEMO_LOGIN=false trong .env.local.
 */
export const DEMO_LOGIN_ENABLED = process.env.EXPO_PUBLIC_DEMO_LOGIN !== 'false';

/** Hộ DTH-H000128 (KV07 · DV01) của kịch bản demo. */
export const DEMO_PHONE = DEMO_LOGIN_ENABLED ? '0902000128' : '';

/** OTP cố định mô phỏng của backend (CITIZEN_DEMO_OTP). */
export const DEMO_OTP = DEMO_LOGIN_ENABLED ? '123456' : '';
