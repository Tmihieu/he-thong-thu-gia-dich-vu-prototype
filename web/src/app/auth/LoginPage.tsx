import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

import { ApiError } from '../../api/client';
import { homePath, ROLE_BASE } from '../layout/menuConfig';
import { FullPageSpin } from '../pages/StatusPages';
import { type Role, useAuth } from './authContext';
import { DEMO_ACCOUNTS, DEMO_LOGIN_ENABLED, DEMO_PASSWORD } from './demoAccounts';

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
    <div className="login-page">
      <aside className="login-brand" aria-hidden="true">
        <img src="/logo-dong-thanh.jpg" alt="" width={96} height={96} />
        <h2>Quản lý thu giá dịch vụ vệ sinh môi trường</h2>
        <p>UBND xã Đông Thạnh · Thành phố Hồ Chí Minh</p>
        <ul>
          <li>Theo dõi khoản thu theo từng hộ, từng tổ</li>
          <li>Đối soát tiền công ty nộp về xã</li>
          <li>Báo cáo rõ ràng cho lãnh đạo</li>
        </ul>
      </aside>
      <main className="login-panel">
        <Card className="login-card" variant="borderless">
          <img className="login-logo" src="/logo-dong-thanh.jpg" alt="Logo xã Đông Thạnh" width={64} height={64} />
          <Typography.Title level={2} className="login-title">
            Đăng nhập
          </Typography.Title>
          <Typography.Paragraph type="secondary">Hệ thống quản lý thu giá dịch vụ vệ sinh môi trường</Typography.Paragraph>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
          <Form<LoginForm>
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            disabled={submitting}
            initialValues={DEMO_LOGIN_ENABLED ? { username: DEMO_ACCOUNTS[0]!.username, password: DEMO_PASSWORD } : undefined}
          >
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên đăng nhập' }]}
            >
              <Input size="large" prefix={<UserOutlined />} autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
              <Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" size="large" htmlType="submit" block loading={submitting}>
              Đăng nhập
            </Button>
          </Form>
          {DEMO_LOGIN_ENABLED && (
            <>
              <Divider plain style={{ fontSize: 13 }}>
                Đăng nhập nhanh tài khoản demo
              </Divider>
              <Flex wrap gap={8} justify="center">
                {DEMO_ACCOUNTS.map((a) => (
                  <Button
                    key={a.username}
                    disabled={submitting}
                    title={a.username}
                    onClick={() => void onFinish({ username: a.username, password: DEMO_PASSWORD })}
                  >
                    {a.label}
                  </Button>
                ))}
              </Flex>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
