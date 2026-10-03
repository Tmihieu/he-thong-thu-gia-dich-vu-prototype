import { Typography } from 'antd';

import { MoneyText } from '../../shared/MoneyText';
import type { LedgerRow } from './api';

/**
 * Các dòng phụ dưới "Phải thu" của sổ công ty–kỳ: công ty cầm lại / phải nộp xã (BR-REM-02, 03), điều chỉnh kỳ trước và
 * đã hoàn (BR-LD-07). Chỉ đọc số backend đã trả, không tính lại; dòng bằng 0 thì ẩn.
 */
export function LedgerBreakdown({ row }: { row: LedgerRow }) {
  const lines: [string, number][] = [
    ['công ty cầm lại', row.retained],
    ['phải nộp xã', row.payable],
    ['điều chỉnh kỳ trước', row.adjustment],
    ['đã hoàn', row.refunded],
  ];
  const shown = lines.filter(([label, v]) => v !== 0 || label === 'phải nộp xã');
  return (
    <>
      {shown.map(([label, v]) => (
        <div key={label}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {label} <MoneyText value={v} />
          </Typography.Text>
        </div>
      ))}
    </>
  );
}
