import { PrinterOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import type { ReactNode } from 'react';

import { amountInWords } from '../../../shared/amountInWords';
import { formatDate, formatMoney } from '../../../shared/format';
import { RECEIPT_METHOD_LABELS } from '../../../shared/labels';
import type { Receipt } from '../api';

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .receipt-print, .receipt-print * { visibility: visible !important; }
  .receipt-print { position: absolute; inset: 0; padding: 24px; }
}`;

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <td style={{ padding: '4px 12px 4px 0', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{label}:</td>
      <td style={{ padding: '4px 0' }}>{children}</td>
    </tr>
  );
}

/** Bản in phiếu thu công ty: số tiền bằng chữ (R29) và lũy kế đã nộp tới phiếu này (R30). */
export function ReceiptPrint({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  return (
    <Modal
      open={receipt !== null}
      onCancel={onClose}
      width={720}
      title="Bản in phiếu thu"
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
          In
        </Button>,
      ]}
    >
      <style>{PRINT_CSS}</style>
      {receipt && (
        <div className="receipt-print" style={{ fontFamily: 'serif', fontSize: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div>UBND XÃ ĐÔNG THẠNH</div>
              <div style={{ fontSize: 13 }}>Thành phố Hồ Chí Minh</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>Số: {receipt.code}</div>
              <div style={{ fontSize: 13 }}>Ngày {formatDate(receipt.receiptDate)}</div>
            </div>
          </div>
          <h2 style={{ textAlign: 'center', margin: '20px 0 4px' }}>PHIẾU THU</h2>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>Tiền dịch vụ thu gom, vận chuyển chất thải rắn sinh hoạt</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <Line label="Đơn vị nộp">
                {receipt.companyName} ({receipt.companyCode})
              </Line>
              <Line label="Người nộp">{receipt.payerName}</Line>
              <Line label="Kỳ thu">{receipt.periodLabel}</Line>
              <Line label="Số tiền">
                <strong>{formatMoney(receipt.amount)}</strong>
              </Line>
              <Line label="Bằng chữ">
                <em>{amountInWords(receipt.amount)}</em>
              </Line>
              <Line label="Hình thức">
                {RECEIPT_METHOD_LABELS[receipt.method]}
                {receipt.documentRef ? ` · chứng từ ${receipt.documentRef}` : ''}
              </Line>
              <Line label="Lũy kế đã nộp kỳ này">{formatMoney(receipt.cumulativePaid)}</Line>
              <Line label="Phải nộp kỳ này">{formatMoney(receipt.periodDue)}</Line>
              <Line label="Còn phải nộp">{formatMoney(receipt.remainingAfter)}</Line>
              {receipt.note && <Line label="Ghi chú">{receipt.note}</Line>}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 32, textAlign: 'center' }}>
            <div>
              <strong>Người nộp tiền</strong>
              <div style={{ fontSize: 13 }}>(Ký, ghi rõ họ tên)</div>
            </div>
            <div>
              <strong>Cán bộ thu</strong>
              <div style={{ fontSize: 13 }}>(Ký, ghi rõ họ tên)</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
