import { Tabs } from 'antd';

import { useTabParam } from '../../shared/useTabParam';
import { PageHeader } from '../../shared/PageHeader';
import { PayoutsPage } from '../remittance/PayoutsPage/PayoutsPage';
import { ReceiptIssuesPage } from '../remittance/ReceiptIssuesPage/ReceiptIssuesPage';
import { ReceiptsPage } from '../remittance/ReceiptsPage/ReceiptsPage';
import { ChargeRequestTab } from './ChargeRequestPage/ChargeRequestTab';
import { ChargesPage } from './ChargesPage/ChargesPage';

const TABS = ['charges', 'requests', 'receipts', 'payouts', 'receipt-issues'] as const;

/** Màn "Khoản thu" của cán bộ xã: danh sách khoản, phiếu YCT (kèm kỳ chờ mở hệ thống tự tạo), phiếu thu công ty (T30), phiếu chi trả công ty khi xã trả lại tiền (UC-55), sai sót phiếu thu công ty báo (T35). */
export function ChargesHubPage() {
  const [tab, setTab] = useTabParam(TABS, 'charges');
  return (
    <>
      <PageHeader title="Khoản thu" description="Khoản thu từng hộ, phiếu yêu cầu thu và phiếu thu tiền công ty nộp về xã, phiếu chi xã trả lại công ty." />
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
          { key: 'receipts', label: 'Phiếu thu công ty', children: <ReceiptsPage /> },
          { key: 'payouts', label: 'Phiếu chi trả công ty', children: <PayoutsPage /> },
          { key: 'receipt-issues', label: 'Sai sót phiếu thu', children: <ReceiptIssuesPage /> },
        ]}
      />
    </>
  );
}
