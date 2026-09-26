import { Tabs, Typography } from 'antd';

import { CompanyReceiptsPage } from '../remittance/CompanyReceiptsPage/CompanyReceiptsPage';
import { CollectorAssignPage } from './CollectorAssignPage/CollectorAssignPage';
import { CompanyHouseholdsPage } from './CompanyHouseholdsPage/CompanyHouseholdsPage';
import { CompanyOverviewPage } from './CompanyOverviewPage/CompanyOverviewPage';

/**
 * Màn "Khu vực được giao" của công ty (prototype: assigned): tổng quan + nhận tiền mặt (T29), hộ được giao,
 * phân tổ (T28), phiếu thu xã lập (T35).
 */
export function CompanyHubPage() {
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Khu vực được giao
      </Typography.Title>
      <Tabs
        items={[
          { key: 'overview', label: 'Tổng quan', children: <CompanyOverviewPage /> },
          { key: 'households', label: 'Hộ được giao', children: <CompanyHouseholdsPage /> },
          { key: 'collectors', label: 'Phân tổ', children: <CollectorAssignPage /> },
          { key: 'receipts', label: 'Phiếu thu xã lập', children: <CompanyReceiptsPage /> },
        ]}
      />
    </>
  );
}
