import { Tabs, Typography } from 'antd';

import { useTabParam } from '../../shared/useTabParam';
import { ReceiptIssuesPage } from '../remittance/ReceiptIssuesPage/ReceiptIssuesPage';
import { ReceiptsPage } from '../remittance/ReceiptsPage/ReceiptsPage';
import { ChargeRequestTab } from './ChargeRequestPage/ChargeRequestTab';
import { ChargesPage } from './ChargesPage/ChargesPage';

const TABS = ['requests', 'charges', 'receipts', 'receipt-issues'] as const;

/** Màn "Khoản thu" của cán bộ xã: phiếu YCT, danh sách khoản, phiếu thu công ty (T30), sai sót phiếu thu công ty báo (T35). */
export function ChargesHubPage() {
  const [tab, setTab] = useTabParam(TABS, 'requests');
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Khoản thu
      </Typography.Title>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'requests', label: 'Phiếu YCT', children: <ChargeRequestTab /> },
          { key: 'charges', label: 'Khoản thu', children: <ChargesPage /> },
          { key: 'receipts', label: 'Phiếu thu công ty', children: <ReceiptsPage /> },
          { key: 'receipt-issues', label: 'Sai sót phiếu thu', children: <ReceiptIssuesPage /> },
        ]}
      />
    </>
  );
}
