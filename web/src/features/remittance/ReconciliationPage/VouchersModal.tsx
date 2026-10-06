import { Button, Modal, Table } from 'antd';
import { useState } from 'react';

import { DateText } from '../../../shared/DateText';
import { RECEIPT_METHOD_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { type LedgerRow, type Payout, type Receipt, usePayouts, useReceipts } from '../api';
import { PayoutPrint } from '../PayoutsPage/PayoutPrint';
import { ReceiptPrint } from '../ReceiptsPage/ReceiptPrint';

/** Xem các phiếu thu và phiếu chi của một công ty trong kỳ (bấm "Xem phiếu" ở dòng đã khớp); mỗi phiếu có nút In. */
export function VouchersModal({ row, onClose }: { row: LedgerRow | null; onClose: () => void }) {
  const receipts = useReceipts(row?.periodId, row?.companyId);
  const payouts = usePayouts(row?.periodId, row?.companyId);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);
  const [printPayout, setPrintPayout] = useState<Payout | null>(null);

  return (
    <>
      <Modal title={row ? `Phiếu của ${row.companyName}` : 'Phiếu'} open={row !== null} onCancel={onClose} footer={null} width={720} destroyOnHidden>
        <Table<Receipt>
          size="small"
          rowKey="id"
          loading={receipts.isLoading}
          dataSource={receipts.data ?? []}
          pagination={false}
          locale={{ emptyText: 'Không có phiếu thu' }}
          title={() => <strong>Phiếu thu (công ty nộp xã)</strong>}
          columns={[
            { title: 'Số phiếu', dataIndex: 'code' },
            { title: 'Ngày nộp', dataIndex: 'receiptDate', render: (d: string) => <DateText value={d} /> },
            { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
            { title: 'Hình thức', dataIndex: 'method', render: (m: Receipt['method']) => RECEIPT_METHOD_LABELS[m] },
            { title: '', render: (_, r) => <Button size="small" onClick={() => setPrintReceipt(r)} aria-label={`In ${r.code}`}>In</Button> },
          ]}
        />
        <Table<Payout>
          size="small"
          rowKey="id"
          style={{ marginTop: 16 }}
          loading={payouts.isLoading}
          dataSource={payouts.data ?? []}
          pagination={false}
          locale={{ emptyText: 'Không có phiếu chi' }}
          title={() => <strong>Phiếu chi (xã trả công ty)</strong>}
          columns={[
            { title: 'Số phiếu', dataIndex: 'code' },
            { title: 'Ngày trả', dataIndex: 'payoutDate', render: (d: string) => <DateText value={d} /> },
            { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
            { title: 'Hình thức', dataIndex: 'method', render: (m: Payout['method']) => RECEIPT_METHOD_LABELS[m] },
            { title: '', render: (_, p) => <Button size="small" onClick={() => setPrintPayout(p)} aria-label={`In ${p.code}`}>In</Button> },
          ]}
        />
      </Modal>
      <ReceiptPrint receipt={printReceipt} onClose={() => setPrintReceipt(null)} />
      <PayoutPrint payout={printPayout} onClose={() => setPrintPayout(null)} />
    </>
  );
}
