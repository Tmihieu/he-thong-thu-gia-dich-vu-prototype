import { Card, Col, Row, Statistic } from 'antd';

import { MoneyText } from '../../shared/MoneyText';
import type { LedgerRow } from './api';

type Key = 'due' | 'retained' | 'payable' | 'received' | 'remaining';
const STATS: [string, Key][] = [
  ['Phải thu', 'due'],
  ['Công ty cầm lại', 'retained'],
  ['Phải nộp xã', 'payable'],
  ['Đã nộp về xã', 'received'],
  ['Còn phải nộp', 'remaining'],
];

/** Hàng thẻ tổng của các dòng sổ công ty–kỳ (cộng thẳng số backend trả; công ty chỉ nhận dòng của mình). */
export function LedgerStats({ rows, loading }: { rows: LedgerRow[]; loading?: boolean }) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      {STATS.map(([title, key]) => (
        <Col key={key} xs={12} md={8} xl={4} style={{ flexGrow: 1 }}>
          <Card size="small" loading={loading} className="section-card">
            <Statistic
              title={title}
              value={rows.reduce((t, r) => t + r[key], 0)}
              formatter={(v) => <MoneyText value={Number(v)} strong={key === 'remaining'} />}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
