import { Alert, Card, Col, Empty, Flex, Row, Skeleton, Tag, Typography } from 'antd';

import { brand } from '../../../app/theme';
import { PERIOD_STATUS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { type Period, usePeriods } from '../../masterdata/api';
import { type LedgerRow, useCompanyLedgers } from '../api';

const pctText = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}%`;
const sum = (rows: LedgerRow[], key: 'due' | 'collected') => rows.reduce((t, r) => t + r[key], 0);

/** Thanh ngang: nền nhạt = phải thu, phần đậm = đã thu; cùng thang với các kỳ bên cạnh để so được độ lớn. */
function ScaleBar({ due, collected, max }: { due: number; collected: number; max: number }) {
  const w = (v: number) => `${max > 0 ? (v * 100) / max : 0}%`;
  return (
    <div aria-hidden style={{ height: 10, borderRadius: 5, background: '#eef1f4', margin: '10px 0 0' }}>
      <div style={{ width: w(due), height: '100%', borderRadius: 5, background: brand.primarySoft }}>
        <div style={{ width: due > 0 ? `${(collected * 100) / due}%` : 0, maxWidth: '100%', height: '100%', borderRadius: 5, background: brand.primary }} />
      </div>
    </div>
  );
}

function PeriodColumn({ period, rows, max }: { period: Period; rows: LedgerRow[]; max: number }) {
  const due = sum(rows, 'due');
  const collected = sum(rows, 'collected');
  return (
    <div style={{ boxSizing: 'border-box', height: '100%', padding: 16, borderRadius: 12, border: `1px solid ${brand.border}`, background: '#fff' }}>
      <Flex justify="space-between" align="center">
        <Typography.Text strong style={{ fontSize: 15 }}>
          {period.label}
        </Typography.Text>
        <Tag color={period.status === 'LOCKED' ? 'default' : 'green'} style={{ marginInlineEnd: 0 }}>
          {PERIOD_STATUS_LABELS[period.status]}
        </Tag>
      </Flex>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, marginTop: 8, color: brand.heading }}>
        <MoneyText value={collected} />
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        đã thu trên <MoneyText value={due} /> phải thu{due > 0 && ` (${pctText((collected * 100) / due)})`}
      </Typography.Text>
      <ScaleBar due={due} collected={collected} max={max} />
    </div>
  );
}

/**
 * Thu 3 tháng gần nhất ở đầu màn đối soát: tháng mới nhất bên trái; mỗi tháng có tổng đã thu / phải thu (thanh cùng thang giữa các tháng).
 */
export function PeriodTrend() {
  const periods = usePeriods();
  const recent = (periods.data ?? [])
    .filter((p) => p.periodType === 'MONTH')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 3);
  const ledgers = useCompanyLedgers(recent.map((p) => p.id));
  const loading = periods.isLoading || ledgers.some((q) => q.isLoading);
  const failed = periods.error ?? ledgers.find((q) => q.error)?.error;
  const max = Math.max(0, ...ledgers.map((q) => sum(q.data ?? [], 'due')));

  return (
    <Card
      size="small"
      className="section-card"
      title="Thu 3 tháng gần nhất"
      style={{ marginBottom: 16 }}
    >
      {failed ? (
        <Alert type="error" showIcon message="Không tải được số liệu các tháng" />
      ) : loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : recent.length === 0 ? (
        <Empty description="Chưa có kỳ thu theo tháng" />
      ) : (
        <Row gutter={[16, 16]}>
          {recent.map((p, i) => (
            <Col key={p.id} xs={24} md={8}>
              <PeriodColumn period={p} rows={ledgers[i]?.data ?? []} max={max} />
            </Col>
          ))}
        </Row>
      )}
    </Card>
  );
}
