import { Button, Modal, Table } from 'antd';
import { useState } from 'react';

import { DateText } from '../../../shared/DateText';
import { RECEIPT_METHOD_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { type LedgerRow, type Receipt, useReceipts } from '../api';
import { ReceiptPrint } from '../ReceiptsPage/ReceiptPrint';

/** Xem các phiếu thu (công ty nộp xã) của một công ty trong kỳ (bấm "Xem phiếu" ở dòng đã khớp); mỗi phiếu có nút In. */
export function VouchersModal({ row, onClose }: { row: LedgerRow | null; onClose: () => void }) {
  const receipts = useReceipts(row?.periodId, row?.companyId);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

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
      </Modal>
      <ReceiptPrint receipt={printReceipt} onClose={() => setPrintReceipt(null)} />
    </>
  );
}
