import { Card, Descriptions, Typography } from 'antd';

import { DateText } from '../shared/DateText';
import { MoneyText } from '../shared/MoneyText';

/** Trang tạm của khung web; thay bằng trang đăng nhập và layout theo vai trò ở T08. */
export function HomePage() {
  return (
    <div style={{ maxWidth: 720, margin: '48px auto', padding: '0 16px' }}>
      <Typography.Title level={3}>Thu giá dịch vụ VSMT – xã Đông Thạnh</Typography.Title>
      <Card title="Khung web đã sẵn sàng">
        <Descriptions column={1}>
          <Descriptions.Item label="Định dạng tiền">
            <MoneyText value={1234567} />
          </Descriptions.Item>
          <Descriptions.Item label="Định dạng ngày">
            <DateText value="2026-10-01" />
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
