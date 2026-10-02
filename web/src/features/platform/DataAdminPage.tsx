import { DatabaseOutlined } from '@ant-design/icons';
import { Button, Result } from 'antd';

/** Jmix chạy như service riêng, nginx / proxy Vite đưa ra cùng domain tại /jmix; mở ở tab mới. */
export const JMIX_ADMIN_URL = '/jmix/';

export function DataAdminPage() {
  return (
    <Result
      icon={<DatabaseOutlined />}
      title="Quản trị dữ liệu"
      subTitle="Xem, sửa, xóa mềm và khôi phục dữ liệu các bảng. Mở ở tab mới."
      extra={
        <Button type="primary" href={JMIX_ADMIN_URL} target="_blank" rel="noopener">
          Mở Quản trị dữ liệu
        </Button>
      }
    />
  );
}
