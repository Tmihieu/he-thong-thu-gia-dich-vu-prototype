import { LogoutOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions } from 'antd';

import { useAuth } from '../../app/auth/authContext';
import { ROLE_LABELS } from '../../app/layout/menuConfig';

/** Tài khoản người đi thu: thông tin đăng nhập và đăng xuất. */
export function CollectorAccountPage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <Card size="small">
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Họ tên">{user.fullName}</Descriptions.Item>
        <Descriptions.Item label="Tên đăng nhập">{user.username}</Descriptions.Item>
        <Descriptions.Item label="Vai trò">{ROLE_LABELS[user.role]}</Descriptions.Item>
      </Descriptions>
      <Button block danger icon={<LogoutOutlined />} onClick={logout} style={{ marginTop: 12 }}>
        Đăng xuất
      </Button>
    </Card>
  );
}
