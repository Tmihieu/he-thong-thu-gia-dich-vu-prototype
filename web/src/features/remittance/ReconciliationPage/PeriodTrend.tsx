import { Card, Col, Flex, Row, theme, Typography } from 'antd';

import { cappedRate } from '../rateBand';

import { PERIOD_STATUS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { type Period, usePeriods } from '../../masterdata/api';
import { type LedgerRow, useCompanyLedgers } from '../api';

const pctText = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}%`;
const sum = (rows: LedgerRow[], key: 'due' | 'collected') => rows.reduce((t, r) => t + r[key], 0);

/** Thanh ngang: cả thanh = phải thu của kỳ, phần đậm = đã thu, nên độ dài phần đậm đúng bằng tỷ lệ thu (tối đa 100%). */
function ScaleBar({ rate }: { rate: number }) {
  const { token } = theme.useToken();
  return (
    <div aria-hidden style={{ height: 10, borderRadius: 5, background: token.colorFillTertiary, margin: '10px 0 0' }}>
      <div style={{ width: `${cappedRate(rate)}%`, height: '100%', borderRadius: 5, background: token.colorPrimary }} />
    </div>
  );
}

function PeriodColumn({ period, rows, selected, onSelect }: { period: Period; rows: LedgerRow[]; selected: boolean; onSelect: () => void }) {
  const { token } = theme.useToken();
  const due = sum(rows, 'due');
  const collected = sum(rows, 'collected');
  const rate = due > 0 ? (collected * 100) / due : 0;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Xem đối soát ${period.label}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{ boxSizing: 'border-box', height: '100%', padding: 16, borderRadius: 12, cursor: 'pointer', border: `${selected ? 2 : 1}px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`, background: token.colorBgContainer }}
    >
      <Flex justify="space-between" align="center">
        <Typography.Text strong style={{ fontSize: 15 }}>
          {period.label}
        </Typography.Text>
        <StatusTag tone={period.status === 'LOCKED' ? 'neutral' : 'success'}>
          {PERIOD_STATUS_LABELS[period.status]}
        </StatusTag>
      </Flex>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, marginTop: 8, color: token.colorTextHeading }}>
        <MoneyText value={collected} />
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        đã thu <MoneyText value={collected} /> trên <MoneyText value={due} /> phải thu ({pctText(rate)})
      </Typography.Text>
      <ScaleBar rate={rate} />
    </div>
  );
}

/**
 * Thu 3 tháng gần nhất ở đầu màn đối soát: tháng mới nhất bên trái; mỗi tháng có tổng đã thu / phải thu và tỷ lệ thu; bấm một tháng thì bảng bên dưới lọc theo tháng đó.
 */
export function PeriodTrend({ selectedId, onSelect }: { selectedId?: number; onSelect: (id: number) => void }) {
  const periods = usePeriods();
  const recent = (periods.data ?? [])
    .filter((p) => p.periodType === 'MONTH')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 3);
  const ledgers = useCompanyLedgers(recent.map((p) => p.id));
  const loading = periods.isLoading || ledgers.some((q) => q.isLoading);
  const failed = periods.error ?? ledgers.find((q) => q.error)?.error;

  return (
    <Card
      size="small"
      className="section-card"
      title="Thu 3 tháng gần nhất"
      style={{ marginBottom: 16 }}
    >
      {failed ? (
        <ErrorBlock error={failed} />
      ) : loading ? (
        <LoadingBlock rows={3} />
      ) : recent.length === 0 ? (
        <EmptyBlock title="Chưa có kỳ thu theo tháng" hint="Quản trị mở kỳ thu để xem so sánh 3 tháng gần nhất." />
      ) : (
        <Row gutter={[16, 16]}>
          {recent.map((p, i) => (
            <Col key={p.id} xs={24} md={8}>
              <PeriodColumn period={p} rows={ledgers[i]?.data ?? []} selected={p.id === selectedId} onSelect={() => onSelect(p.id)} />
            </Col>
          ))}
        </Row>
      )}
    </Card>
  );
}
