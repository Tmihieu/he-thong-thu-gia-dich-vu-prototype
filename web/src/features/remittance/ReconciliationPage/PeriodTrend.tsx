import { Alert, Card, Col, Empty, Flex, Progress, Row, Skeleton, Tag, Tooltip, Typography } from 'antd';

import { brand } from '../../../app/theme';
import { PERIOD_STATUS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { type Period, usePeriods } from '../../masterdata/api';
import { type LedgerRow, useCompanyLedgers } from '../api';

const RATE_BANDS = [
  { below: 25, color: '#d92d20', label: 'Dưới 25%' },
  { below: 50, color: '#eaaa08', label: '25 - dưới 50%' },
  { below: 75, color: '#ef6820', label: '50 - dưới 75%' },
  { below: Infinity, color: brand.primary, label: 'Từ 75%' },
] as const;

/** Màu vòng tiến độ theo tỷ lệ thu: < 25 đỏ, 25–< 50 vàng, 50–< 75 cam, ≥ 75 xanh lá. */
export function rateColor(rate: number): string {
  return RATE_BANDS.find((b) => rate < b.below)!.color;
}

const pctText = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}%`;
const sum = (rows: LedgerRow[], key: 'due' | 'collected') => rows.reduce((t, r) => t + r[key], 0);

/** Thanh ngang: nền nhạt = phải thu, phần đậm = đã thu; cùng thang với các kỳ bên cạnh để so được độ lớn. */
function ScaleBar({ due, collected, max }: { due: number; collected: number; max: number }) {
  const w = (v: number) => `${max > 0 ? (v * 100) / max : 0}%`;
  return (
    <div aria-hidden style={{ height: 10, borderRadius: 5, background: '#eef1f4', margin: '10px 0 16px' }}>
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
    <div style={{ height: '100%', padding: 16, borderRadius: 12, border: `1px solid ${brand.border}`, background: '#fff' }}>
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
      {rows.length === 0 ? (
        <Typography.Text type="secondary">Chưa có khoản phải thu</Typography.Text>
      ) : (
        <Flex wrap gap={16}>
          {rows.map((r) => (
            <Tooltip
              key={r.companyId}
              title={
                <>
                  {r.companyName}
                  <br />
                  Đã thu <MoneyText value={r.collected} /> / <MoneyText value={r.due} />
                </>
              }
            >
              <Flex vertical align="center" gap={4} aria-label={`${r.companyCode} ${pctText(r.collectionRate)}`}>
                <Progress
                  type="circle"
                  size={60}
                  strokeWidth={9}
                  percent={r.collectionRate}
                  strokeColor={rateColor(r.collectionRate)}
                  format={(p) => <span style={{ fontSize: 13, fontWeight: 600 }}>{pctText(p ?? 0)}</span>}
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {r.companyCode}
                </Typography.Text>
              </Flex>
            </Tooltip>
          ))}
        </Flex>
      )}
    </div>
  );
}

/**
 * Thu 3 tháng gần nhất ở đầu màn đối soát: tháng mới nhất bên trái; mỗi tháng có tổng đã thu / phải thu (thanh cùng thang
 * giữa các tháng) và vòng tỷ lệ thu (đã thu / phải thu) của từng công ty môi trường.
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
      extra={
        <Flex wrap gap={12}>
          {RATE_BANDS.map((b) => (
            <Flex key={b.label} align="center" gap={6}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: b.color }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {b.label}
              </Typography.Text>
            </Flex>
          ))}
        </Flex>
      }
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
