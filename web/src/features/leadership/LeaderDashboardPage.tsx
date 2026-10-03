import { AlertOutlined, AuditOutlined, FallOutlined } from '@ant-design/icons';
import { Alert, Card, Col, Empty, List, Progress, Row, Space, Table, theme, Typography } from 'antd';
import { type ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { formatPercent } from '../../shared/format';
import { StatusTag } from '../../shared/StatusTag';
import { PageHeader } from '../../shared/PageHeader';
import { ErrorBlock, LoadingBlock } from '../../shared/StateBlock';
import { PROGRESS_COLORS, PROGRESS_LABELS } from '../../shared/labels';
import { MoneyText, RemainingText } from '../../shared/MoneyText';
import { StatCard, StatGrid } from '../../shared/StatCard';
import { cappedRate, rateBand } from '../remittance/rateBand';
import { PeriodSelect } from '../masterdata/PeriodSelect';
import { type AreaProgress, type LedgerRow, useAreaProgress, useCompanyLedger } from '../remittance/api';
import { useApprovals } from './api';

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part * 1000) / whole) / 10 : 0);
const pctText = formatPercent;

/** Vòng tỷ lệ, màu theo dải BR-REM-11 (QĐ-L13). */
function Ring({ percent }: { percent: number }) {
  const { token } = theme.useToken();
  return <Progress type="circle" size={64} percent={cappedRate(percent)} strokeColor={token[rateBand(percent)]} format={(p) => pctText(p ?? 0)} />;
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
          payable: t.payable + r.payable,
          collected: t.collected + r.collected,
          received: t.received + r.received,
          remaining: t.remaining + r.remaining,
          previousDebt: t.previousDebt + r.previousDebt,
        }),
        { due: 0, payable: 0, collected: 0, received: 0, remaining: 0, previousDebt: 0 },
      ),
    [rows],
  );
  const late = rows.filter((r) => r.overdue || r.previousDebt > 0);
  const lowRate = rows.filter((r) => r.due > 0 && r.lowCollectionRate);
  const lowAreas = useMemo(
    () => (areas.data ?? []).filter((a) => a.chargeCount > 0).sort((a, b) => a.collectionRate - b.collectionRate).slice(0, 8),
    [areas.data],
  );
  const noAlarm = !ledger.isLoading && late.length === 0 && lowRate.length === 0 && (pending.data?.length ?? 0) === 0;
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
      <StatGrid>
        <StatCard label="Phải thu" value={<MoneyText value={total.due} />} hint={`${rows.length} công ty`} tone="info" />
        <StatCard
          label="Công ty đã thu"
          value={<MoneyText value={total.collected} />}
          hint="trên số phải thu"
          tone="success"
          aside={<Ring percent={pct(total.collected, total.due)} />}
        />
        <StatCard
          label="Đã nộp về xã"
          value={<MoneyText value={total.received} />}
          hint="trên số phải nộp xã"
          tone="info"
          aside={<Ring percent={pct(total.received, total.payable)} />}
        />
        <StatCard
          label="Còn phải nộp"
          value={<RemainingText value={total.remaining} />}
          tone="danger"
          hint={
            total.previousDebt > 0 ? (
              <Typography.Text type="danger">
                Nợ kỳ trước <MoneyText value={total.previousDebt} />
              </Typography.Text>
            ) : (
              'Không có nợ kỳ trước'
            )
          }
        />
      </StatGrid>
      )}

      {noAlarm ? (
        <Alert type="success" showIcon style={{ marginTop: 16 }} message="Không có cảnh báo" />
      ) : (
      <Card size="small" className="section-card" style={{ marginTop: 16 }} title="Cảnh báo">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Alarm icon={<AlertOutlined />} title="Nộp chậm / nợ kỳ trước" count={late.length} tone="red">
              {late.map((r) => (
                <List.Item key={r.companyId}>
                  <span>{r.companyCode}</span>
                  <span>
                    {r.overdue && <>còn <RemainingText value={r.remaining} /></>}
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
      )}

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
                  render: (_, r) => <Progress size="small" percent={Math.min(100, r.remittedRate)} status={r.lowCollectionRate ? 'exception' : 'normal'} strokeColor="#175cd3" format={(p) => pctText(p ?? 0)} />,
                },
                { title: 'Còn phải nộp', align: 'right', render: (_, r) => <RemainingText value={r.remaining} /> },
                { title: 'Tiến độ', render: (_, r) => <StatusTag color={PROGRESS_COLORS[r.progress]}>{PROGRESS_LABELS[r.progress]}</StatusTag> },
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
        <StatusTag color={count > 0 ? tone : 'default'}>{count}</StatusTag>
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
