import { Tabs, Typography } from 'antd';

import { useTabParam } from '../../shared/useTabParam';
import { ReceiptIssuesPage } from '../remittance/ReceiptIssuesPage/ReceiptIssuesPage';
import { ReceiptsPage } from '../remittance/ReceiptsPage/ReceiptsPage';
import { ChargeRequestTab } from './ChargeRequestPage/ChargeRequestTab';
import { ChargesPage } from './ChargesPage/ChargesPage';

const TABS = ['charges', 'requests', 'receipts', 'receipt-issues'] as const;

/** Màn "Khoản thu" của cán bộ xã: danh sách khoản, phiếu YCT, biên nhận công ty (T30), sai sót biên nhận công ty báo (T35). */
export function ChargesHubPage() {
  const [tab, setTab] = useTabParam(TABS, 'charges');
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Khoản thu
      </Typography.Title>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'charges', label: 'Khoản thu', children: <ChargesPage /> },
          { key: 'requests', label: 'Phiếu YCT', children: <ChargeRequestTab /> },
          { key: 'receipts', label: 'Biên nhận công ty', children: <ReceiptsPage /> },
          { key: 'receipt-issues', label: 'Sai sót biên nhận', children: <ReceiptIssuesPage /> },
        ]}
      />
    </>
  );
}
