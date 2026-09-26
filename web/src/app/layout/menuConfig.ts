import {
  AccountBookOutlined,
  ApartmentOutlined,
  AuditOutlined,
  BankOutlined,
  CommentOutlined,
  EnvironmentOutlined,
  FileSearchOutlined,
  FundOutlined,
  HomeOutlined,
  SettingOutlined,
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
};

export const ROLE_BASE: Record<Role, string> = {
  COMMUNE_OFFICER: '/commune',
  COMPANY_MANAGER: '/company',
  COLLECTOR: '/collector',
  ADMIN: '/admin',
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
    { path: 'complaints', label: 'Khiếu nại', icon: CommentOutlined },
  ],
  COMPANY_MANAGER: [
    { path: 'assigned', label: 'Khu vực được giao', icon: ApartmentOutlined },
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
