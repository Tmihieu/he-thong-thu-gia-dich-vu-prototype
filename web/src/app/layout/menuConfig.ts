import {
  AccountBookOutlined,
  ApartmentOutlined,
  AuditOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  BankOutlined,
  CommentOutlined,
  EnvironmentOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FundOutlined,
  HomeOutlined,
  SettingOutlined,
  ShopOutlined,
  SwapOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ComponentType } from 'react';

import type { Role } from '../auth/authContext';

export interface MenuEntry {
  /** Đường dẫn con, nối sau {@link ROLE_BASE} của vai trò. */
  path: string;
  label: string;
  icon: ComponentType;
}

export const ROLE_LABELS: Record<Role, string> = {
  COMMUNE_OFFICER: 'Cán bộ xã',
  COMPANY_MANAGER: 'Công ty môi trường',
  COLLECTOR: 'Người đi thu',
  ADMIN: 'Quản trị',
  LEADER: 'Lãnh đạo',
};

export const ROLE_BASE: Record<Role, string> = {
  COMMUNE_OFFICER: '/commune',
  COMPANY_MANAGER: '/company',
  COLLECTOR: '/collector',
  ADMIN: '/admin',
  LEADER: '/leader',
};

/** Danh mục màn hình theo vai trò, lấy từ docs/reference/prototype-inventory.md §3. */
export const MENU: Record<Role, MenuEntry[]> = {
  COMMUNE_OFFICER: [
    { path: 'subjects', label: 'Hồ sơ hộ', icon: HomeOutlined },
    { path: 'charges', label: 'Khoản thu', icon: AccountBookOutlined },
    { path: 'areas', label: 'Khu vực', icon: EnvironmentOutlined },
    { path: 'companies', label: 'Công ty', icon: BankOutlined },
    { path: 'progress', label: 'Tiến độ thu', icon: FundOutlined },
    { path: 'reconciliation', label: 'Đối soát', icon: AuditOutlined },
    { path: 'settlements', label: 'Phiếu quyết toán', icon: FileDoneOutlined },
    { path: 'transfers', label: 'Chuyển khoản chờ đối chiếu', icon: SwapOutlined },
    { path: 'complaints', label: 'Khiếu nại', icon: CommentOutlined },
    { path: 'market', label: 'Chợ cộng đồng', icon: ShopOutlined },
  ],
  COMPANY_MANAGER: [
    { path: 'assigned', label: 'Khu vực được giao', icon: ApartmentOutlined },
    { path: 'collectors', label: 'Người đi thu', icon: TeamOutlined },
    { path: 'complaints', label: 'Khiếu nại', icon: CommentOutlined },
  ],
  COLLECTOR: [
    { path: 'list', label: 'Danh sách thu', icon: UnorderedListOutlined },
    { path: 'cash', label: 'Tiền mặt', icon: WalletOutlined },
    { path: 'account', label: 'Tài khoản', icon: UserOutlined },
  ],
  ADMIN: [
    { path: 'accounts', label: 'Tài khoản', icon: TeamOutlined },
    { path: 'config', label: 'Cấu hình', icon: SettingOutlined },
    { path: 'logs', label: 'Nhật ký', icon: FileSearchOutlined },
    { path: 'data', label: 'Quản trị dữ liệu', icon: DatabaseOutlined },
  ],
  // Lãnh đạo chỉ xem + duyệt (SPEC §9.10): tiến độ, đối soát dùng lại màn của xã ở chế độ chỉ đọc.
  LEADER: [
    { path: 'dashboard', label: 'Dashboard', icon: DashboardOutlined },
    { path: 'report', label: 'Báo cáo tổng hợp', icon: BarChartOutlined },
    { path: 'progress', label: 'Tiến độ thu', icon: FundOutlined },
    { path: 'reconciliation', label: 'Đối soát', icon: AuditOutlined },
    { path: 'settlements', label: 'Phiếu quyết toán', icon: FileDoneOutlined },
  ],
};

export function menuPath(role: Role, entry: MenuEntry): string {
  return `${ROLE_BASE[role]}/${entry.path}`;
}

/** Trang mặc định sau khi đăng nhập: mục menu đầu tiên của vai trò. */
export function homePath(role: Role): string {
  return menuPath(role, MENU[role][0]!);
}

export const ROLES = Object.keys(ROLE_BASE) as Role[];
