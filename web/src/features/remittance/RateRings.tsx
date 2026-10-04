import { Card, Col, Progress, Row, theme, Typography } from 'antd';

import { MoneyText } from '../../shared/MoneyText';
import type { LedgerRow } from './api';
import { rateBand } from './rateBand';

/** Vòng tỷ lệ thu (đã thu / phải thu) của từng công ty ở màn Đối soát; số lấy nguyên từ sổ công ty–kỳ. */
export function RateRings({ rows }: { rows: LedgerRow[] }) {
  const { token } = theme.useToken();
  const colorOf = (rate: number) => token[rateBand(rate)];
  if (rows.length === 0) return null;
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {rows.map((r) => (
        <Col key={r.companyId} xs={24} sm={12} lg={8}>
          <Card size="small" className="section-card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                size={88}
                percent={Math.min(100, r.collectionRate)}
                strokeColor={colorOf(r.collectionRate)}
                format={() => `${Math.round(r.collectionRate).toLocaleString('vi-VN')}%`}
                aria-label={`Tỷ lệ thu ${r.companyCode}`}
              />
              <div style={{ minWidth: 0 }}>
                <Typography.Text strong>{r.companyCode} · {r.companyName}</Typography.Text>
                <div>
                  <Typography.Text type="secondary">
                    đã thu <MoneyText value={r.collected} /> trên <MoneyText value={r.due} /> phải thu
                  </Typography.Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
