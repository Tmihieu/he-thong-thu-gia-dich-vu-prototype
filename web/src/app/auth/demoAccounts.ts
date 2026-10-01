/**
 * Tài khoản demo (docs/demo-accounts.md) để người trình diễn bấm là vào được.
 * Tắt khi build bằng VITE_DEMO_LOGIN=false (môi trường có dữ liệu thật).
 */
export const DEMO_LOGIN_ENABLED = import.meta.env.VITE_DEMO_LOGIN !== 'false';

export const DEMO_PASSWORD = 'Demo@2026';

export interface DemoAccount {
  username: string;
  label: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'admin', label: 'Quản trị' },
  { username: 'canbo_xa', label: 'Cán bộ xã' },
  { username: 'lanhdao', label: 'Lãnh đạo' },
  { username: 'dv01', label: 'Công ty DV01' },
  { username: 'thu07', label: 'Người thu KV07' },
];
