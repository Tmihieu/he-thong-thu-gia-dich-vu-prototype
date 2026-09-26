import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

import { ApiError } from '../../api/client';
import { homePath, ROLE_BASE } from '../layout/menuConfig';
import { FullPageSpin } from '../pages/StatusPages';
import { type Role, useAuth } from './authContext';

interface LoginForm {
  username: string;
  password: string;
}

function targetAfterLogin(role: Role, from: unknown): string {
  // Chỉ quay lại trang cũ nếu trang đó thuộc vai trò vừa đăng nhập.
  if (typeof from === 'string' && from.startsWith(ROLE_BASE[role] + '/')) return from;
  return homePath(role);
}

export function LoginPage() {
  const { status, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'loading') return <FullPageSpin />;
  if (status === 'authenticated' && user) return <Navigate to={targetAfterLogin(user.role, from)} replace />;

  async function onFinish(values: LoginForm) {
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(values.username, values.password);
      navigate(targetAfterLogin(me.role, from), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập không thành công. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16, background: '#f5f7f5' }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Thu giá dịch vụ VSMT
        </Typography.Title>
        <Typography.Paragraph type="secondary">Xã Đông Thạnh · đăng nhập cho cán bộ xã, công ty và quản trị</Typography.Paragraph>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
        <Form<LoginForm> layout="vertical" onFinish={onFinish} requiredMark={false} disabled={submitting}>
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input prefix={<UserOutlined />} autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}
