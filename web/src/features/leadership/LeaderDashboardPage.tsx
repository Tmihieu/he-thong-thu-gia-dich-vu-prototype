import { AlertOutlined, AuditOutlined, FallOutlined } from '@ant-design/icons';
import { Card, Col, Empty, List, Progress, Row, Space, Table, Tag, Typography } from 'antd';
import { type ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { formatPercent } from '../../shared/format';
import { PageHeader } from '../../shared/PageHeader';
import { ErrorBlock, LoadingBlock } from '../../shared/StateBlock';
import { PROGRESS_COLORS, PROGRESS_LABELS } from '../../shared/labels';
import { MoneyText } from '../../shared/MoneyText';
import { PeriodSelect } from '../masterdata/PeriodSelect';
import { type AreaProgress, type LedgerRow, useAreaProgress, useCompanyLedger } from '../remittance/api';
import { useApprovals } from './api';

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part * 1000) / whole) / 10 : 0);
const pctText = formatPercent;

function Kpi({ label, value, note, percent, color }: { label: string; value: number; note: ReactNode; percent?: number; color: string }) {
  return (
    <Card size="small" className="section-card" style={{ height: '100%' }}>
      <Space align="center" size="middle">
        {percent !== undefined && (
          <Progress type="circle" size={72} percent={percent} strokeColor={color} format={(p) => pctText(p ?? 0)} />
        )}
        <div>
          <Typography.Text type="secondary">{label}</Typography.Text>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>
            <MoneyText value={value} />
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {note}
          </Typography.Text>
        </div>
      </Space>
    </Card>
  );
}

/**
 * Dashboard điều hành của lãnh đạo (T59): tổng thu / nộp / nợ của kỳ lấy nguyên sổ công ty–kỳ, cảnh báo (nộp chậm /
 * nợ kỳ trước, tỷ lệ thu thấp theo cờ sẵn có, đề nghị chờ duyệt), tỷ lệ theo công ty và theo tổ.
 */
export function LeaderDashboardPage() {
  const [periodId, setPeriodId] = useState<number>();
  const ledger = useCompanyLedger(periodId);
  const areas = useAreaProgress(periodId);
  const pending = useApprovals('PENDING');
  const rows = useMemo(() => ledger.data ?? [], [ledger.data]);

  const total = useMemo(
    () =>
      rows.reduce(
        (t, r) => ({
          due: t.due + r.due,
          collected: t.collected + r.collected,
          received: t.received + r.received,
          remaining: t.remaining + Math.max(r.remaining, 0),
          previousDebt: t.previousDebt + r.previousDebt,
        }),
        { due: 0, collected: 0, received: 0, remaining: 0, previousDebt: 0 },
      ),
    [rows],
  );
  const late = rows.filter((r) => r.overdue || r.previousDebt > 0);
  const lowRate = rows.filter((r) => r.due > 0 && r.lowCollectionRate);
  const lowAreas = useMemo(
    () => (areas.data ?? []).filter((a) => a.chargeCount > 0).sort((a, b) => a.collectionRate - b.collectionRate).slice(0, 8),
    [areas.data],
  );
  const error = ledger.error ?? areas.error ?? pending.error;
  const retry = () => void Promise.all([ledger.refetch(), areas.refetch(), pending.refetch()]);

  return (
    <>
      <PageHeader title="Dashboard điều hành" description="Tình hình thu và nộp tiền theo công ty và tổ trong kỳ." />
      <Space style={{ marginBottom: 16 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
      </Space>
      {error && <ErrorBlock error={error} onRetry={retry} />}
      {ledger.isLoading ? <LoadingBlock rows={3} /> : (
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Kpi label="Phải thu" value={total.due} note={`${rows.length} công ty`} color="#0b3a67" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Kpi label="Công ty đã thu" value={total.collected} percent={pct(total.collected, total.due)} color="#16794a" note="trên số phải thu" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Kpi label="Đã nộp về xã" value={total.received} percent={pct(total.received, total.due)} color="#175cd3" note="trên số phải thu" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Kpi
            label="Còn phải nộp"
            value={total.remaining}
            color="#b42318"
            note={
              total.previousDebt > 0 ? (
                <Typography.Text type="danger">
                  Nợ kỳ trước <MoneyText value={total.previousDebt} />
                </Typography.Text>
              ) : (
                'Không có nợ kỳ trước'
              )
            }
          />
        </Col>
      </Row>
      )}

      <Card size="small" className="section-card" style={{ marginTop: 16 }} title="Cảnh báo">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Alarm icon={<AlertOutlined />} title="Nộp chậm / nợ kỳ trước" count={late.length} tone="red">
              {late.map((r) => (
                <List.Item key={r.companyId}>
                  <span>{r.companyCode}</span>
                  <span>
                    {r.overdue && <>còn <MoneyText value={r.remaining} /></>}
                    {r.previousDebt > 0 && (
                      <Typography.Text type="danger">
                        {r.overdue ? ' · ' : ''}nợ trước <MoneyText value={r.previousDebt} />
                      </Typography.Text>
                    )}
                  </span>
                </List.Item>
              ))}
            </Alarm>
          </Col>
          <Col xs={24} lg={8}>
            <Alarm icon={<FallOutlined />} title="Tỷ lệ nộp thấp (dưới 45%)" count={lowRate.length} tone="orange">
              {lowRate.map((r) => (
                <List.Item key={r.companyId}>
                  <span>{r.companyCode}</span>
                  <span>{pctText(r.remittedRate)}</span>
                </List.Item>
              ))}
            </Alarm>
          </Col>
          <Col xs={24} lg={8}>
            <Alarm icon={<AuditOutlined />} title="Đề nghị chờ duyệt" count={pending.data?.length ?? 0} tone="gold">
              {(pending.data ?? []).length > 0 && (
                <List.Item>
                  <Link to="/leader/approvals">Mở hàng chờ duyệt</Link>
                </List.Item>
              )}
            </Alarm>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={14}>
          <Card size="small" className="section-card" title="Theo công ty">
            <Table<LedgerRow>
              size="small"
              rowKey="companyId"
              loading={ledger.isLoading}
              dataSource={rows}
              pagination={false}
              locale={{ emptyText: 'Kỳ này chưa có khoản phải thu' }}
              columns={[
                { title: 'Công ty', render: (_, r) => <span title={r.companyName}>{r.companyCode}</span> },
                { title: 'Phải thu', align: 'right', render: (_, r) => <MoneyText value={r.due} /> },
                {
                  title: 'Tỷ lệ thu',
                  width: 150,
                  render: (_, r) => (
                    <Progress size="small" percent={r.collectionRate} format={(p) => pctText(p ?? 0)} />
                  ),
                },
                {
                  title: 'Tỷ lệ nộp',
                  width: 150,
                  render: (_, r) => <Progress size="small" percent={r.remittedRate} status={r.lowCollectionRate ? 'exception' : 'normal'} strokeColor="#175cd3" format={(p) => pctText(p ?? 0)} />,
                },
                { title: 'Còn phải nộp', align: 'right', render: (_, r) => <MoneyText value={r.remaining} /> },
                { title: 'Tiến độ', render: (_, r) => <Tag color={PROGRESS_COLORS[r.progress]}>{PROGRESS_LABELS[r.progress]}</Tag> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card size="small" className="section-card" title="Tổ có tỷ lệ thu thấp nhất">
            <Table<AreaProgress>
              size="small"
              rowKey="areaId"
              loading={areas.isLoading}
              dataSource={lowAreas}
              pagination={false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có số liệu" /> }}
              columns={[
                {
                  title: 'Tổ',
                  render: (_, a) => (
                    <>
                      <div>{a.areaCode}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {a.districtCode} · {a.companyCode ?? 'chưa có công ty'}
                      </Typography.Text>
                    </>
                  ),
                },
                { title: 'Hộ đã thu', align: 'right', render: (_, a) => `${a.paidCount}/${a.chargeCount}` },
                {
                  title: 'Tỷ lệ thu',
                  width: 150,
                  render: (_, a) => <Progress size="small" percent={a.collectionRate} status={a.lowCollectionRate ? 'exception' : 'normal'} format={(p) => pctText(p ?? 0)} />,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function Alarm({ icon, title, count, tone, children }: { icon: ReactNode; title: string; count: number; tone: string; children: ReactNode }) {
  return (
    <div>
      <Space style={{ marginBottom: 4 }}>
        {icon}
        <Typography.Text strong>{title}</Typography.Text>
        <Tag color={count > 0 ? tone : 'default'}>{count}</Tag>
      </Space>
      {count > 0 ? (
        <List size="small" split={false} style={{ maxHeight: 180, overflow: 'auto' }}>
          {children}
        </List>
      ) : (
        <Typography.Text type="secondary" style={{ display: 'block' }}>
          Không có
        </Typography.Text>
      )}
    </div>
  );
}
