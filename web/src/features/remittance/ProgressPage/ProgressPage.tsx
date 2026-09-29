import { Alert, Button, Card, Col, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { useAuth } from '../../../app/auth/authContext';
import { PROGRESS_COLORS, PROGRESS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type AreaProgress, type LedgerRow, useAreaProgress, useCompanyLedger } from '../api';
import { ReminderModal } from './ReminderModal';

function Rate({ rate, low }: { rate: number; low: boolean }) {
  return (
    <Space size={4} style={{ minWidth: 150 }}>
      <Progress percent={rate} size="small" showInfo={false} status={low ? 'exception' : 'normal'} style={{ width: 80 }} />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{rate.toLocaleString('vi-VN')}%</span>
    </Space>
  );
}

function sum(rows: LedgerRow[], key: 'due' | 'collected' | 'received' | 'remaining' | 'previousDebt') {
  return rows.reduce((t, r) => t + r[key], 0);
}

/**
 * Tiến độ thu theo công ty và theo tổ (§10 bước 5, R13): trạng thái nộp, nợ kỳ trước, cờ dưới 45% như prototype —
 * công ty theo đã nộp về xã / phải thu, tổ theo đã thu / phải thu.
 */
export function ProgressPage() {
  const [periodId, setPeriodId] = useState<number>();
  const [reminding, setReminding] = useState<number | null>(null);
  // Lãnh đạo xem màn này chỉ đọc: không nhắc nộp (SPEC §9.10).
  const readOnly = useAuth().user?.role === 'LEADER';
  const ledger = useCompanyLedger(periodId);
  const areas = useAreaProgress(periodId);
  const rows = ledger.data ?? [];
  const unassigned = (areas.data ?? []).filter((a) => a.noCompany && a.subjectCount > 0);
  const overdue = rows.filter((r) => r.progress === 'OVERDUE');

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Tiến độ thu
      </Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
      </Space>
      {ledger.error && <Alert type="error" showIcon message={ledger.error instanceof ApiError ? ledger.error.message : 'Không tải được số liệu'} />}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {(
          [
            ['Phải thu', sum(rows, 'due')],
            ['Công ty đã thu', sum(rows, 'collected')],
            ['Đã nộp về xã', sum(rows, 'received')],
            ['Còn phải nộp', sum(rows, 'remaining')],
            ['Nợ kỳ trước', sum(rows, 'previousDebt')],
          ] as const
        ).map(([title, value]) => (
          <Col key={title} xs={12} md={8} lg={4}>
            <Card size="small">
              <Statistic title={title} value={value} formatter={(v) => <MoneyText value={Number(v)} />} />
            </Card>
          </Col>
        ))}
      </Row>
      {overdue.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${overdue.length} công ty quá hạn nộp`}
          description={
            !readOnly && (
            <Space wrap>
              {overdue.map((r) => (
                <Button key={r.companyId} size="small" danger onClick={() => setReminding(r.companyId)}>
                  Nhắc nộp {r.companyCode}
                </Button>
              ))}
            </Space>
            )
          }
        />
      )}
      {unassigned.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${unassigned.length} tổ chưa có công ty thu: ${unassigned.map((a) => a.areaCode).join(', ')}`}
        />
      )}
      <Table<LedgerRow>
        rowKey="companyId"
        loading={ledger.isLoading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: 'Kỳ này chưa có khoản phải thu' }}
        expandable={{
          expandedRowRender: (r) => (
            <Table<AreaProgress>
              size="small"
              rowKey={(a) => `${a.areaId}-${a.companyId}`}
              pagination={false}
              dataSource={(areas.data ?? []).filter((a) => a.companyId === r.companyId)}
              columns={[
                { title: 'Tổ', render: (_, a) => `${a.areaCode} · ${a.areaName}` },
                { title: 'Số hộ', dataIndex: 'subjectCount', align: 'right' },
                { title: 'Khoản đã thu', render: (_, a) => `${a.paidCount}/${a.chargeCount}` },
                { title: 'Phải thu', dataIndex: 'due', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                { title: 'Đã thu', dataIndex: 'collected', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                { title: 'Tỷ lệ', render: (_, a) => <Rate rate={a.collectionRate} low={a.lowCollectionRate} /> },
              ]}
            />
          ),
        }}
        columns={[
          { title: 'Công ty', render: (_, r) => `${r.companyCode} · ${r.companyName}` },
          { title: 'Phải thu', dataIndex: 'due', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          {
            title: 'Đã thu',
            dataIndex: 'collected',
            align: 'right',
            render: (v: number, r) => (
              <>
                <MoneyText value={v} />
                <div>
                  <Typography.Text type="secondary">{`${r.collectionRate.toLocaleString('vi-VN')}% đã thu`}</Typography.Text>
                </div>
              </>
            ),
          },
          { title: 'Đã nộp về xã', dataIndex: 'received', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Tỷ lệ nộp', render: (_, r) => <Rate rate={r.remittedRate} low={r.lowRemittedRate} /> },
          { title: 'Còn phải nộp', dataIndex: 'remaining', align: 'right', render: (v: number) => <MoneyText value={v} strong /> },
          {
            title: 'Nợ kỳ trước',
            dataIndex: 'previousDebt',
            align: 'right',
            render: (v: number) => (v > 0 ? <Typography.Text type="danger"><MoneyText value={v} /></Typography.Text> : '—'),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'progress',
            render: (p: LedgerRow['progress'], r) => (
              <Space size={4} wrap>
                <Tag color={PROGRESS_COLORS[p]}>{PROGRESS_LABELS[p]}</Tag>
                {p === 'OVERDUE' && !readOnly && (
                  <Button size="small" danger onClick={() => setReminding(r.companyId)} aria-label={`Nhắc nộp ${r.companyCode}`}>
                    Nhắc nộp
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <ReminderModal companyId={reminding} onClose={() => setReminding(null)} />
    </>
  );
}
