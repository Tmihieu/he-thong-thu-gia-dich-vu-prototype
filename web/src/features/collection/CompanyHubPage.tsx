import { Tabs, Typography } from 'antd';

import { useTabParam } from '../../shared/useTabParam';
import { CompanyReceiptsPage } from '../remittance/CompanyReceiptsPage/CompanyReceiptsPage';
import { CollectorAssignPage } from './CollectorAssignPage/CollectorAssignPage';
import { CompanyOverviewPage } from './CompanyOverviewPage/CompanyOverviewPage';

// Hộ được giao nằm ngay dưới tổng quan; link cũ ?tab=households rơi về tổng quan.
const TABS = ['overview', 'collectors', 'receipts'] as const;

/**
 * Màn "Khu vực được giao" của công ty (prototype: assigned): tổng quan + nhận tiền mặt (T29) + hộ được giao,
 * phân tổ (T28), biên nhận xã lập (T35).
 */
export function CompanyHubPage() {
  const [tab, setTab] = useTabParam(TABS, 'overview');
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Khu vực được giao
      </Typography.Title>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'Tổng quan', children: <CompanyOverviewPage /> },
          { key: 'collectors', label: 'Phân tổ', children: <CollectorAssignPage /> },
          { key: 'receipts', label: 'Biên nhận xã lập', children: <CompanyReceiptsPage /> },
        ]}
      />
    </>
  );
}
