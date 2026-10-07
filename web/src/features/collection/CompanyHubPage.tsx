import { Tabs } from 'antd';

import { PageHeader } from '../../shared/PageHeader';
import { useTabParam } from '../../shared/useTabParam';
import { SettlementsPage } from '../remittance/SettlementsPage/SettlementsPage';
import { CompanyOverviewPage } from './CompanyOverviewPage/CompanyOverviewPage';

// Hộ được giao nằm ngay dưới tổng quan; link cũ ?tab=households rơi về tổng quan.
const TABS = ['overview', 'settlements'] as const;

/**
 * Màn "Khu vực được giao" của công ty (prototype: assigned): tổng quan + nhận tiền mặt (T29) + hộ của công ty,
 * phiếu quyết toán xã lập (chỉ xem). Không còn phân tổ; chuyển khoản chờ đối chiếu là của cán bộ xã (UC-27).
 */
export function CompanyHubPage() {
  const [tab, setTab] = useTabParam(TABS, 'overview');
  return (
    <>
      <PageHeader title="Khu vực được giao" description="Tiền thu, tiền nhận từ người đi thu và phiếu quyết toán xã lập cho công ty." />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'Tổng quan', children: <CompanyOverviewPage /> },
          { key: 'settlements', label: 'Phiếu quyết toán', children: <SettlementsPage /> },
        ]}
      />
    </>
  );
}
