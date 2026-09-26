import { Button, Result, Spin } from 'antd';
import { Link, Navigate } from 'react-router';

import { useAuth } from '../auth/authContext';
import { homePath } from '../layout/menuConfig';

function HomeButton() {
  const { user } = useAuth();
  return (
    <Link to={user ? homePath(user.role) : '/login'}>
      <Button type="primary">Về trang chính</Button>
    </Link>
  );
}

export function ForbiddenPage() {
  return <Result status="403" title="403" subTitle="Bạn không có quyền truy cập trang này." extra={<HomeButton />} />;
}

export function NotFoundPage() {
  return <Result status="404" title="404" subTitle="Không tìm thấy trang." extra={<HomeButton />} />;
}

export function UnderConstructionPage({ title }: { title: string }) {
  return <Result status="info" title={title} subTitle="Đang xây dựng. Màn hình này sẽ có trong các task tiếp theo." />;
}

export function FullPageSpin() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <Spin size="large" />
    </div>
  );
}

/** Gốc "/": về trang chính của vai trò đang đăng nhập, chưa đăng nhập thì về /login. */
export function RootRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageSpin />;
  return <Navigate to={user ? homePath(user.role) : '/login'} replace />;
}
