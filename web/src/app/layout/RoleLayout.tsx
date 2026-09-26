import { LogoutOutlined } from '@ant-design/icons';
import { Button, Layout, Menu, Space, Typography } from 'antd';
import { createElement } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { type Me, useAuth } from '../auth/authContext';
import { MENU, menuPath, ROLE_LABELS } from './menuConfig';

function UserBox({ user, onLogout }: { user: Me; onLogout: () => void }) {
  return (
    <Space size="middle">
      <span>
        <Typography.Text strong>{user.fullName}</Typography.Text>
        <Typography.Text type="secondary"> · {ROLE_LABELS[user.role]}</Typography.Text>
      </span>
      <Button icon={<LogoutOutlined />} onClick={onLogout}>
        Đăng xuất
      </Button>
    </Space>
  );
}

/** Người đi thu dùng giao diện điện thoại: thanh tiêu đề + thanh điều hướng dưới. */
function MobileLayout({ user, onLogout }: { user: Me; onLogout: () => void }) {
  const { pathname } = useLocation();
  const items = MENU[user.role];
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center' }}>
        <Typography.Text strong style={{ flex: 1 }}>
          {user.fullName}
        </Typography.Text>
        <Button size="small" icon={<LogoutOutlined />} onClick={onLogout} aria-label="Đăng xuất" />
      </header>
      <main style={{ flex: 1, padding: 16 }}>
        <Outlet />
      </main>
      <nav aria-label="Điều hướng" style={{ display: 'flex', borderTop: '1px solid #eee', position: 'sticky', bottom: 0, background: '#fff' }}>
        {items.map((entry) => {
          const to = menuPath(user.role, entry);
          const active = pathname.startsWith(to);
          return (
            <Link key={entry.path} to={to} style={{ flex: 1, textAlign: 'center', padding: '8px 0', color: active ? '#1677ff' : '#555' }}>
              <div>{createElement(entry.icon)}</div>
              <div style={{ fontSize: 12 }}>{entry.label}</div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Layout theo vai trò: menu trái cho vai trò nội bộ trên máy tính, giao diện điện thoại cho người đi thu. */
export function RoleLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  if (!user) return null;
  if (user.role === 'COLLECTOR') return <MobileLayout user={user} onLogout={logout} />;

  const items = MENU[user.role].map((entry) => ({
    key: menuPath(user.role, entry),
    icon: createElement(entry.icon),
    label: <Link to={menuPath(user.role, entry)}>{entry.label}</Link>,
  }));
  const selected = items.find((i) => pathname.startsWith(i.key))?.key;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider breakpoint="lg" collapsedWidth={0} theme="light" width={220}>
        <div style={{ padding: 16 }}>
          <Typography.Text strong>VSMT Đông Thạnh</Typography.Text>
        </div>
        <Menu mode="inline" items={items} selectedKeys={selected ? [selected] : []} aria-label="Menu chính" />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', paddingInline: 16 }}>
          <UserBox user={user} onLogout={logout} />
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
