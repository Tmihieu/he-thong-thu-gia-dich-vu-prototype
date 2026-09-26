import { Tabs, Typography } from 'antd';

import { CompanyReceiptsPage } from '../remittance/CompanyReceiptsPage/CompanyReceiptsPage';
import { CollectorAssignPage } from './CollectorAssignPage/CollectorAssignPage';
import { CompanyHouseholdsPage } from './CompanyHouseholdsPage/CompanyHouseholdsPage';

/**
 * Màn "Khu vực được giao" của công ty (prototype: assigned): hộ được giao, phân tổ (T28), phiếu thu xã lập (T35);
 * tổng quan tiến độ và nhận tiền mặt thêm ở T29.
 */
export function CompanyHubPage() {
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Khu vực được giao
      </Typography.Title>
      <Tabs
        items={[
          { key: 'households', label: 'Hộ được giao', children: <CompanyHouseholdsPage /> },
          { key: 'collectors', label: 'Phân tổ', children: <CollectorAssignPage /> },
          { key: 'receipts', label: 'Phiếu thu xã lập', children: <CompanyReceiptsPage /> },
        ]}
      />
    </>
  );
}
