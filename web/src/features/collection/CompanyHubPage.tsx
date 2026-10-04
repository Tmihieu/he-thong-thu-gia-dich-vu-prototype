import { Tabs } from 'antd';

import { PageHeader } from '../../shared/PageHeader';
import { useTabParam } from '../../shared/useTabParam';
import { CompanyReceiptsPage } from '../remittance/CompanyReceiptsPage/CompanyReceiptsPage';
import { CollectorAssignPage } from './CollectorAssignPage/CollectorAssignPage';
import { CompanyOverviewPage } from './CompanyOverviewPage/CompanyOverviewPage';

// Hộ được giao nằm ngay dưới tổng quan; link cũ ?tab=households rơi về tổng quan.
const TABS = ['overview', 'collectors', 'receipts'] as const;

/**
 * Màn "Khu vực được giao" của công ty (prototype: assigned): tổng quan + nhận tiền mặt (T29) + hộ được giao,
 * phân tổ (T28), phiếu thu xã lập (T35).
 */
export function CompanyHubPage() {
  const [tab, setTab] = useTabParam(TABS, 'overview');
  return (
    <>
      <PageHeader title="Khu vực được giao" description="Tiền thu, tiền nhận từ người đi thu, phân tổ và phiếu thu xã lập cho công ty." />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'Tổng quan', children: <CompanyOverviewPage /> },
          { key: 'collectors', label: 'Phân tổ', children: <CollectorAssignPage /> },
          { key: 'receipts', label: 'Phiếu thu xã lập', children: <CompanyReceiptsPage /> },
        ]}
      />
    </>
  );
}
