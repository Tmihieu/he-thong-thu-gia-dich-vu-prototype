import { Tabs } from 'antd';

import { PageHeader } from '../../shared/PageHeader';
import { useTabParam } from '../../shared/useTabParam';
import { CompanyReceiptsPage } from '../remittance/CompanyReceiptsPage/CompanyReceiptsPage';
import { CompanyOverviewPage } from './CompanyOverviewPage/CompanyOverviewPage';

// Hộ được giao nằm ngay dưới tổng quan; link cũ ?tab=households rơi về tổng quan.
const TABS = ['overview', 'receipts'] as const;

/**
 * Màn "Khu vực được giao" của công ty (prototype: assigned): tổng quan + nhận tiền mặt (T29) + hộ của công ty,
 * phiếu thu xã lập (T35). Không còn phân tổ; chuyển khoản chờ đối chiếu là của cán bộ xã (UC-27).
 */
export function CompanyHubPage() {
  const [tab, setTab] = useTabParam(TABS, 'overview');
  return (
    <>
      <PageHeader title="Khu vực được giao" description="Tiền thu, tiền nhận từ người đi thu và phiếu thu xã lập cho công ty." />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'Tổng quan', children: <CompanyOverviewPage /> },
          { key: 'receipts', label: 'Phiếu thu xã lập', children: <CompanyReceiptsPage /> },
        ]}
      />
    </>
  );
}
