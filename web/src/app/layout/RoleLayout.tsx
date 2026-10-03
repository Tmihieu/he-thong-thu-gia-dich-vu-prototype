import { LogoutOutlined, MenuOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { createElement, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { NotificationBell } from '../../features/notifications/NotificationBell';
import { type Me, useAuth } from '../auth/authContext';
import { homePath, MENU, menuPath } from './menuConfig';
import './shell.css';

const SYSTEM_NAME = 'Quản lý thu giá dịch vụ vệ sinh môi trường';

function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return ((words.length > 1 ? words[0]![0] : '') + (words.at(-1)?.[0] ?? '')).toUpperCase();
}

/** Người đi thu dùng giao diện điện thoại: đầu trang xanh + thanh tab dưới (mẫu GRAC của prototype). */
function MobileLayout({ user, onLogout }: { user: Me; onLogout: () => void }) {
  const { pathname } = useLocation();
  return (
    <div className="clm-shell">
      <header className="clm-hero">
        <img src="/logo-dong-thanh.jpg" alt="" />
        <strong>{user.fullName}</strong>
        <NotificationBell role={user.role} />
        <Button size="small" shape="circle" icon={<LogoutOutlined />} onClick={onLogout} aria-label="Đăng xuất" />
      </header>
      <main className="clm-body">
        <Outlet />
      </main>
      <nav aria-label="Điều hướng" className="clm-tabbar">
        {MENU[user.role].map((entry) => {
          const to = menuPath(user.role, entry);
          return (
            <Link key={entry.path} to={to} className={`clm-tab${pathname.startsWith(to) ? ' active' : ''}`}>
              <span className="clm-tab-icon">{createElement(entry.icon)}</span>
              {entry.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Layout theo vai trò: khung prototype (thanh trên navy, menu trái trắng) cho vai trò nội bộ, giao diện điện thoại cho người đi thu. */
export function RoleLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  if (!user) return null;
  if (user.role === 'COLLECTOR') return <MobileLayout user={user} onLogout={logout} />;

  // Màn hẹp: ☰ mở/đóng ngăn kéo; màn rộng: ☰ thu gọn menu.
  const toggleMenu = () => (window.matchMedia('(max-width: 860px)').matches ? setDrawerOpen((o) => !o) : setCollapsed((c) => !c));

  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
      <header className="topbar">
        <button type="button" className="menu-toggle" onClick={toggleMenu} aria-label="Mở menu" aria-expanded={!collapsed}>
          <MenuOutlined />
        </button>
        <Link className="brand" to={homePath(user.role)} aria-label="Trang chủ hệ thống">
          <img src="/logo-dong-thanh.jpg" alt="" />
          <span className="brand-copy">
            <strong>{SYSTEM_NAME}</strong>
            <small>UBND xã Đông Thạnh · Thành phố Hồ Chí Minh</small>
          </span>
        </Link>
        <div className="top-actions">
          <NotificationBell role={user.role} />
          <span className="top-user">
            <strong>{user.fullName}</strong>
          </span>
          <span className="avatar" aria-hidden="true">
            {initials(user.fullName)}
          </span>
          <Tooltip title="Đăng xuất">
            <Button type="text" icon={<LogoutOutlined />} onClick={logout} aria-label="Đăng xuất" />
          </Tooltip>
        </div>
      </header>

      <aside className={`sidebar${drawerOpen ? ' open' : ''}`}>
        <nav className="role-nav" aria-label="Menu chính">
          {MENU[user.role].map((entry) => {
            const to = menuPath(user.role, entry);
            const active = pathname.startsWith(to);
            return (
              <Link key={entry.path} to={to} className={`nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => setDrawerOpen(false)}>
                <span className="nav-icon">{createElement(entry.icon)}</span>
                {entry.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className={`sidebar-backdrop${drawerOpen ? ' show' : ''}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />

      <main className="main-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>Hệ thống số hóa quản lý và thu giá dịch vụ CTRSH</span>
        <span>UBND xã Đông Thạnh</span>
      </footer>
    </div>
  );
}
