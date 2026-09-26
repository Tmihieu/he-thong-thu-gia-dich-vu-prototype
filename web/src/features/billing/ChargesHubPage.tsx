import { Tabs, Typography } from 'antd';

import { ReceiptIssuesPage } from '../remittance/ReceiptIssuesPage/ReceiptIssuesPage';
import { ChargeRequestTab } from './ChargeRequestPage/ChargeRequestTab';
import { ChargesPage } from './ChargesPage/ChargesPage';

/** Màn "Khoản thu" của cán bộ xã: phiếu YCT, danh sách khoản, sai sót phiếu thu công ty báo (T35); phiếu thu công ty thêm ở T30. */
export function ChargesHubPage() {
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Khoản thu
      </Typography.Title>
      <Tabs
        items={[
          { key: 'requests', label: 'Phiếu YCT', children: <ChargeRequestTab /> },
          { key: 'charges', label: 'Khoản thu', children: <ChargesPage /> },
          { key: 'receipt-issues', label: 'Sai sót phiếu thu', children: <ReceiptIssuesPage /> },
        ]}
      />
    </>
  );
}
