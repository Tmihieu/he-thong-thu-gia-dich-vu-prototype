import { Tabs } from 'antd';

import { useTabParam } from '../../shared/useTabParam';
import { PageHeader } from '../../shared/PageHeader';
import { ReceiptIssuesPage } from '../remittance/ReceiptIssuesPage/ReceiptIssuesPage';
import { ReceiptsPage } from '../remittance/ReceiptsPage/ReceiptsPage';
import { ChargeRequestTab } from './ChargeRequestPage/ChargeRequestTab';
import { ChargesPage } from './ChargesPage/ChargesPage';
import { PeriodDraftsTab } from './PeriodDraftsPage/PeriodDraftsTab';

const TABS = ['charges', 'period-drafts', 'requests', 'receipts', 'receipt-issues'] as const;

/** Màn "Khoản thu" của cán bộ xã: danh sách khoản, kỳ chờ mở (hệ thống tự tạo), phiếu YCT, phiếu thu công ty (T30), sai sót phiếu thu công ty báo (T35). */
export function ChargesHubPage() {
  const [tab, setTab] = useTabParam(TABS, 'charges');
  return (
    <>
      <PageHeader title="Khoản thu" description="Khoản thu từng hộ, phiếu yêu cầu thu và phiếu thu tiền công ty nộp về xã." />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'charges', label: 'Khoản thu', children: <ChargesPage /> },
          { key: 'period-drafts', label: 'Kỳ chờ mở', children: <PeriodDraftsTab /> },
          { key: 'requests', label: 'Phiếu YCT', children: <ChargeRequestTab /> },
          { key: 'receipts', label: 'Phiếu thu công ty', children: <ReceiptsPage /> },
          { key: 'receipt-issues', label: 'Sai sót phiếu thu', children: <ReceiptIssuesPage /> },
        ]}
      />
    </>
  );
}
