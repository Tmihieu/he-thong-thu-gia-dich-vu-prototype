import { PrinterOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import type { ReactNode } from 'react';

import { formatDate, formatMoney } from '../../../shared/format';
import { RECEIPT_METHOD_LABELS } from '../../../shared/labels';
import type { Payout } from '../api';

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

/** Bản in phiếu chi trả công ty: số tiền bằng chữ, lũy kế xã đã trả và số xã còn phải trả. */
export function PayoutPrint({ payout, onClose }: { payout: Payout | null; onClose: () => void }) {
  return (
    <Modal
      open={payout !== null}
      onCancel={onClose}
      width={720}
      title="Bản in phiếu chi trả"
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
      {payout && (
        <div className="receipt-print" style={{ fontFamily: 'serif', fontSize: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div>UBND XÃ ĐÔNG THẠNH</div>
              <div style={{ fontSize: 13 }}>Thành phố Hồ Chí Minh</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>Số: {payout.code}</div>
              <div style={{ fontSize: 13 }}>Ngày {formatDate(payout.payoutDate)}</div>
            </div>
          </div>
          <h2 style={{ textAlign: 'center', margin: '20px 0 4px' }}>PHIẾU CHI TRẢ</h2>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>Xã trả lại tiền dịch vụ thu gom, vận chuyển chất thải rắn sinh hoạt</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <Line label="Đơn vị nhận">
                {payout.companyName} ({payout.companyCode})
              </Line>
              <Line label="Kỳ thu">{payout.periodLabel}</Line>
              <Line label="Số tiền">
                <strong>{formatMoney(payout.amount)}</strong>
              </Line>
              <Line label="Bằng chữ">
                <em>{payout.amountInWords}</em>
              </Line>
              <Line label="Hình thức">
                {RECEIPT_METHOD_LABELS[payout.method]}
                {payout.documentRef ? ` · chứng từ ${payout.documentRef}` : ''}
              </Line>
              <Line label="Xã phải trả kỳ này">{formatMoney(payout.periodOwed)}</Line>
              <Line label="Lũy kế xã đã trả kỳ này">{formatMoney(payout.cumulativePaid)}</Line>
              <Line label="Xã còn phải trả">{formatMoney(payout.remainingAfter)}</Line>
              {payout.note && <Line label="Ghi chú">{payout.note}</Line>}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 32, textAlign: 'center' }}>
            <div>
              <strong>Người nhận tiền</strong>
              <div style={{ fontSize: 13 }}>(Ký, ghi rõ họ tên)</div>
            </div>
            <div>
              <strong>Cán bộ chi</strong>
              <div style={{ fontSize: 13 }}>(Ký, ghi rõ họ tên)</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
