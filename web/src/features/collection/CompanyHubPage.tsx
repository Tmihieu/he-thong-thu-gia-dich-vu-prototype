import { Tabs, Typography } from 'antd';

import { CompanyReceiptsPage } from '../remittance/CompanyReceiptsPage/CompanyReceiptsPage';

/**
 * Màn "Khu vực được giao" của công ty (prototype: assigned). Tab phiếu thu xã lập có từ T35; tổng quan tiến độ,
 * nhận tiền mặt, phân tổ và danh sách hộ thêm ở T28–T29.
 */
export function CompanyHubPage() {
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Khu vực được giao
      </Typography.Title>
      <Tabs items={[{ key: 'receipts', label: 'Phiếu thu xã lập', children: <CompanyReceiptsPage /> }]} />
    </>
  );
}
