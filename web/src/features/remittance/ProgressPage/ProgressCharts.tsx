import { Card, Col, Row, theme, Typography } from 'antd';
import type { ReactNode } from 'react';

import { formatMoney } from '../../../shared/format';
import type { AreaProgress, LedgerRow } from '../api';
import { cappedRate } from '../rateBand';

/** Mốc cảnh báo tỷ lệ thấp của backend (cờ lowRemittedRate / lowCollectionRate). */
const LOW_RATE = 45;
const SLOWEST_AREAS = 8;

const pctText = (rate: number) => `${Math.round(cappedRate(rate)).toLocaleString('vi-VN')}%`;

/** Thanh ngang 0–100% có vạch mốc 45%; `thin` là thanh phụ mảnh nằm ngay dưới. */
function Bar({ rate, color, thin, label }: { rate: number; color: string; thin?: { rate: number; color: string }; label: string }) {
  const { token } = theme.useToken();
  const track = { background: token.colorFillSecondary, borderRadius: 4, overflow: 'hidden' } as const;
  return (
    <div role="img" aria-label={label} style={{ position: 'relative' }}>
      <div style={{ ...track, height: 12 }}>
        <div style={{ width: `${cappedRate(rate)}%`, height: '100%', background: color }} />
      </div>
      {thin && (
        <div style={{ ...track, height: 4, marginTop: 3 }}>
          <div style={{ width: `${cappedRate(thin.rate)}%`, height: '100%', background: thin.color }} />
        </div>
      )}
      <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${LOW_RATE}%`, borderLeft: `2px dashed ${token.colorTextTertiary}` }} />
    </div>
  );
}

function Line({ name, hint, bar, value }: { name: string; hint?: string; bar: ReactNode; value: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1.1fr) 1.4fr minmax(130px, auto)', gap: 12, alignItems: 'center', padding: '7px 0' }}>
      <div style={{ minWidth: 0 }}>
        <Typography.Text ellipsis={{ tooltip: name }} style={{ display: 'block' }}>
          {name}
        </Typography.Text>
        {hint && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {hint}
          </Typography.Text>
        )}
      </div>
      {bar}
      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

const Legend = ({ children }: { children: ReactNode }) => (
  <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '8px 0 0' }}>
    {children}
  </Typography.Paragraph>
);

/**
 * Hai sơ đồ của màn Tiến độ thu, số lấy nguyên từ sổ công ty–kỳ và tiến độ theo tổ:
 * (1) công ty nào chậm nộp về xã — đã nộp / phải nộp về xã, chậm nhất lên đầu, kèm thanh mảnh công ty đã thu của hộ;
 * (2) tổ nào thu chậm — số hộ đã thu / số hộ phải thu của các tổ thấp nhất.
 */
export function ProgressCharts({ rows, areas }: { rows: LedgerRow[]; areas: AreaProgress[] }) {
  const { token } = theme.useToken();
  const tone = (low: boolean) => (low ? token.colorError : token.colorSuccess);
  const companies = [...rows].sort((a, b) => a.remittedRate - b.remittedRate);
  const slowest = areas
    .filter((a) => a.chargeCount > 0 && !a.noCompany)
    .map((a) => ({ ...a, paidRate: (a.paidCount * 100) / a.chargeCount }))
    .sort((a, b) => a.paidRate - b.paidRate)
    .slice(0, SLOWEST_AREAS);
  if (companies.length === 0) return null;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} xl={12}>
        <Card size="small" className="section-card" title="Tiến độ nộp về xã theo công ty" style={{ height: '100%' }}>
          {companies.map((r) => (
            <Line
              key={r.companyId}
              name={r.companyName}
              bar={
                <Bar
                  rate={r.remittedRate}
                  color={tone(r.lowRemittedRate)}
                  thin={{ rate: r.collectionRate, color: token.colorInfo }}
                  label={`${r.companyName}: đã nộp ${pctText(r.remittedRate)} số phải nộp về xã, đã thu ${pctText(r.collectionRate)} của hộ`}
                />
              }
              value={
                r.payable > 0 ? (
                  <>
                    <strong>{pctText(r.remittedRate)}</strong>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{` · ${formatMoney(r.received)} / ${formatMoney(r.payable)}`}</Typography.Text>
                  </>
                ) : (
                  <Typography.Text type="secondary">Không phải nộp</Typography.Text>
                )
              }
            />
          ))}
          <Legend>
            Thanh đậm: đã nộp về xã / phải nộp về xã (đỏ khi dưới {LOW_RATE}%). Thanh mảnh: công ty đã thu / phải thu của hộ. Vạch đứt: mốc {LOW_RATE}%.
          </Legend>
        </Card>
      </Col>
      <Col xs={24} xl={12}>
        <Card size="small" className="section-card" title={`${slowest.length} tổ thu chậm nhất`} style={{ height: '100%' }}>
          {slowest.map((a) => (
            <Line
              key={`${a.areaId}-${a.companyId}`}
              name={`${a.areaCode} · ${a.areaName}`}
              hint={a.companyCode ?? undefined}
              bar={
                <Bar
                  rate={a.paidRate}
                  color={tone(a.lowCollectionRate)}
                  label={`${a.areaCode}: đã thu ${a.paidCount} trên ${a.chargeCount} hộ`}
                />
              }
              value={
                <>
                  <strong>{`${a.paidCount}/${a.chargeCount} hộ`}</strong>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{` · còn ${formatMoney(Math.max(0, a.due - a.collected))}`}</Typography.Text>
                </>
              }
            />
          ))}
          <Legend>Thanh: số hộ đã thu / số hộ phải thu trong kỳ (đỏ khi tiền thu được dưới {LOW_RATE}%). Bấm "+" ở bảng dưới để xem từng hộ chưa thu.</Legend>
        </Card>
      </Col>
    </Row>
  );
}
