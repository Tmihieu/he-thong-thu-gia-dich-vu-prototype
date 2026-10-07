import { PrinterOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import type { ReactNode } from 'react';

import { formatDate, formatMoney } from '../../../shared/format';
import { RECEIPT_METHOD_LABELS, settlementDirection } from '../../../shared/labels';
import type { Settlement } from '../api';

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

/** Bản in phiếu quyết toán công ty – xã của một kỳ: hai số phải trả, chênh lệch và số tiền chuyển bằng chữ. */
export function SettlementPrint({ settlement: s, onClose }: { settlement: Settlement | null; onClose: () => void }) {
  return (
    <Modal
      open={s !== null}
      onCancel={onClose}
      width={720}
      title="Bản in phiếu quyết toán"
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
      {s && (
        <div className="receipt-print" style={{ fontFamily: 'serif', fontSize: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div>UBND XÃ ĐÔNG THẠNH</div>
              <div style={{ fontSize: 13 }}>Thành phố Hồ Chí Minh</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>Số: {s.code}</div>
              <div style={{ fontSize: 13 }}>Ngày {formatDate(s.settleDate)}</div>
            </div>
          </div>
          <h2 style={{ textAlign: 'center', margin: '20px 0 4px' }}>PHIẾU QUYẾT TOÁN</h2>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>Tiền dịch vụ thu gom, vận chuyển chất thải rắn sinh hoạt</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <Line label="Đơn vị thu gom">
                {s.companyName} ({s.companyCode})
              </Line>
              <Line label="Người đại diện công ty">{s.representativeName}</Line>
              <Line label="Kỳ thu">{s.periodLabel}</Line>
              <Line label="Công ty phải nộp xã">{formatMoney(s.companyOwes)}</Line>
              <Line label="Xã phải trả công ty">{formatMoney(s.communeOwes)}</Line>
              <Line label="Chênh lệch">
                <strong>
                  {formatMoney(Math.abs(s.amount))} · {settlementDirection(s.amount)}
                </strong>
              </Line>
              <Line label="Bằng chữ">
                <em>{s.amountInWords}</em>
              </Line>
              {s.method && <Line label="Hình thức">{RECEIPT_METHOD_LABELS[s.method]}</Line>}
              {s.documentRef && <Line label="Số chứng từ">{s.documentRef}</Line>}
              {s.note && <Line label="Ghi chú">{s.note}</Line>}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 32, textAlign: 'center' }}>
            <div>
              <strong>Đại diện công ty</strong>
              <div style={{ fontSize: 13 }}>(Ký, ghi rõ họ tên)</div>
            </div>
            <div>
              <strong>Đại diện UBND xã</strong>
              <div style={{ fontSize: 13 }}>(Ký, ghi rõ họ tên)</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
