import { Alert, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { RECONCILIATION_COLORS, RECONCILIATION_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type LedgerRow, useCompanyLedger } from '../api';

function Gap({ gap }: { gap: number }) {
  if (gap === 0) return <MoneyText value={0} />;
  return (
    <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
      <Typography.Text type={gap < 0 ? 'danger' : undefined}>
        <MoneyText value={gap} />
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {gap < 0 ? 'thu rồi chưa nộp' : 'nộp nhiều hơn báo thu'}
      </Typography.Text>
    </Space>
  );
}

/**
 * Đối soát (R14): phải thu / công ty đã thu / đã nộp về xã / chênh lệch = đã nộp − đã thu. Trong kỳ: Đang nộp;
 * hết hạn còn chưa nộp hoặc nợ kỳ trước: Lệch. Cán bộ xã khóa kỳ từ màn này (G1).
 */
export function ReconciliationPage() {
  const [periodId, setPeriodId] = useState<number>();
  const ledger = useCompanyLedger(periodId);
  const rows = ledger.data ?? [];
  const notRemitted = rows.reduce((t, r) => t + Math.max(0, -r.gap), 0);

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Đối soát
      </Typography.Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
      </Space>
      {ledger.error && <Alert type="error" showIcon message={ledger.error instanceof ApiError ? ledger.error.message : 'Không tải được số liệu'} />}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {(
          [
            ['Phải thu', rows.reduce((t, r) => t + r.due, 0)],
            ['Công ty đã thu', rows.reduce((t, r) => t + r.collected, 0)],
            ['Đã nộp về xã', rows.reduce((t, r) => t + r.received, 0)],
            ['Thu rồi chưa nộp', notRemitted],
          ] as const
        ).map(([title, value]) => (
          <Col key={title} xs={12} md={6}>
            <Card size="small">
              <Statistic title={title} value={value} formatter={(v) => <MoneyText value={Number(v)} />} />
            </Card>
          </Col>
        ))}
      </Row>
      <Table<LedgerRow>
        rowKey="companyId"
        loading={ledger.isLoading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: 'Kỳ này chưa có khoản phải thu' }}
        columns={[
          { title: 'Công ty', render: (_, r) => `${r.companyCode} · ${r.companyName}` },
          { title: 'Phải thu', dataIndex: 'due', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Đã thu', dataIndex: 'collected', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          {
            title: 'Đã nộp về xã',
            align: 'right',
            render: (_, r) => (
              <Space direction="vertical" size={0}>
                <MoneyText value={r.received} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {r.receiptCount} phiếu thu
                </Typography.Text>
              </Space>
            ),
          },
          { title: 'Chênh lệch', dataIndex: 'gap', align: 'right', render: (v: number) => <Gap gap={v} /> },
          {
            title: 'Nợ kỳ trước',
            dataIndex: 'previousDebt',
            align: 'right',
            render: (v: number) => (v > 0 ? <Typography.Text type="danger"><MoneyText value={v} /></Typography.Text> : '—'),
          },
          {
            title: 'Kết quả',
            dataIndex: 'reconciliation',
            render: (s: LedgerRow['reconciliation']) => (
              <Tag color={RECONCILIATION_COLORS[s]}>{RECONCILIATION_LABELS[s]}</Tag>
            ),
          },
        ]}
      />
    </>
  );
}
