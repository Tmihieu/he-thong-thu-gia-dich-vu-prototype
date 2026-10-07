import { Tabs } from 'antd';

import { useTabParam } from '../../shared/useTabParam';
import { PageHeader } from '../../shared/PageHeader';
import { ChargeRequestTab } from './ChargeRequestPage/ChargeRequestTab';
import { ChargesPage } from './ChargesPage/ChargesPage';

const TABS = ['charges', 'requests'] as const;

/** Màn "Khoản thu" của cán bộ xã: danh sách khoản, phiếu YCT (kèm kỳ chờ mở hệ thống tự tạo). Phiếu quyết toán công ty ở màn riêng. */
export function ChargesHubPage() {
  const [tab, setTab] = useTabParam(TABS, 'charges');
  return (
    <>
      <PageHeader title="Khoản thu" description="Khoản thu từng hộ và phiếu yêu cầu thu." />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'charges', label: 'Khoản thu', children: <ChargesPage /> },
          {
            key: 'requests',
            label: 'Phiếu YCT',
            // Tạm tắt "Kỳ chờ mở" (PeriodDraftsTab) cùng tự tạo kỳ.
            children: <ChargeRequestTab />,
          },
        ]}
      />
    </>
  );
}
