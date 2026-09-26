import { Alert, Card, Col, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { PROGRESS_COLORS, PROGRESS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type AreaProgress, type LedgerRow, useAreaProgress, useCompanyLedger } from '../api';

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

/** Tiến độ thu theo công ty và theo tổ (§10 bước 5, R13): trạng thái nộp, cờ tỷ lệ thu dưới 45%, nợ kỳ trước. */
export function ProgressPage() {
  const [periodId, setPeriodId] = useState<number>();
  const ledger = useCompanyLedger(periodId);
  const areas = useAreaProgress(periodId);
  const rows = ledger.data ?? [];
  const unassigned = (areas.data ?? []).filter((a) => a.noCompany && a.subjectCount > 0);

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
          { title: 'Đã thu', dataIndex: 'collected', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Tỷ lệ thu', render: (_, r) => <Rate rate={r.collectionRate} low={r.lowCollectionRate} /> },
          { title: 'Đã nộp về xã', dataIndex: 'received', align: 'right', render: (v: number) => <MoneyText value={v} /> },
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
            render: (p: LedgerRow['progress']) => <Tag color={PROGRESS_COLORS[p]}>{PROGRESS_LABELS[p]}</Tag>,
          },
        ]}
      />
    </>
  );
}
