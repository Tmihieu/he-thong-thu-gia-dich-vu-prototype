import { Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { useAuth } from '../../../app/auth/authContext';
import { MoneyText } from '../../../shared/MoneyText';
import { PageHeader } from '../../../shared/PageHeader';
import { StatCard, StatGrid } from '../../../shared/StatCard';
import { ErrorBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type LedgerRow, useCompanyLedger } from '../api';
import { LedgerBreakdown } from '../LedgerBreakdown';
import { LockPeriodButton } from './LockPeriodButton';
import { PeriodTrend } from './PeriodTrend';

function Gap({ gap }: { gap: number }) {
  if (gap === 0) return <MoneyText value={0} />;
  return (
    <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
      <Typography.Text type={gap < 0 ? 'danger' : undefined}>
        <MoneyText value={gap} />
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {gap < 0 ? 'thu rồi chưa nộp' : 'xã trả lại công ty'}
      </Typography.Text>
    </Space>
  );
}

/**
 * Đối soát (R14, UC-38): phải thu / đã thu (tiền mặt, chuyển khoản) / phí thu gom công ty hưởng / phải nộp xã / đã nộp về
 * xã / chênh lệch = đã nộp − phải nộp xã. Trong kỳ: Đang nộp; hết hạn còn chưa nộp hoặc nợ kỳ trước: Lệch. Cán bộ xã khóa kỳ
 * từ màn này (G1, UC-39).
 */
export function ReconciliationPage() {
  // Lãnh đạo xem màn này chỉ đọc: không khóa kỳ (SPEC §9.10).
  const readOnly = useAuth().user?.role === 'LEADER';
  const [periodId, setPeriodId] = useState<number>();
  const ledger = useCompanyLedger(periodId);
  const rows = ledger.data ?? [];
  const notRemitted = rows.reduce((t, r) => t + Math.max(0, -r.gap), 0);

  return (
    <>
      <PageHeader
        title="Đối soát"
        description="So số đã thu (tiền mặt, chuyển khoản) với số phải nộp xã và số đã nộp; kỳ chỉ khóa được khi mọi công ty nộp đủ và kỳ đã thu đủ hoặc đã đến hạn nộp."
        extra={
          <Space wrap>
            <PeriodSelect value={periodId} onChange={setPeriodId} />
            {periodId !== undefined && !readOnly && <LockPeriodButton periodId={periodId} />}
          </Space>
        }
      />
      <PeriodTrend selectedId={periodId} onSelect={setPeriodId} />
      {ledger.error && <ErrorBlock error={ledger.error} onRetry={() => void ledger.refetch()} />}
      <StatGrid>
        <StatCard label="Phải nộp xã" tone="info" value={<MoneyText value={rows.reduce((t, r) => t + r.payable, 0)} />} />
        <StatCard label="Đã thu (tiền mặt, chuyển khoản)" tone="info" value={<MoneyText value={rows.reduce((t, r) => t + r.collected, 0)} />} />
        <StatCard label="Đã nộp về xã" tone="success" value={<MoneyText value={rows.reduce((t, r) => t + r.received, 0)} />} />
        <StatCard label="Thu rồi chưa nộp" tone={notRemitted > 0 ? 'danger' : 'neutral'} value={<MoneyText value={notRemitted} />} />
      </StatGrid>
      <Table<LedgerRow>
        rowKey="companyId"
        loading={ledger.isLoading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: 'Kỳ này chưa có khoản phải thu' }}
        columns={[
          { title: 'Công ty', dataIndex: 'companyName' },
          {
            title: 'Phải thu',
            dataIndex: 'due',
            align: 'right',
            render: (v: number, r) => (
              <>
                <MoneyText value={v} />
                <LedgerBreakdown row={r} />
              </>
            ),
          },
          {
            title: 'Đã thu',
            dataIndex: 'collected',
            align: 'right',
            render: (v: number, r) => (
              <>
                <MoneyText value={v} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    tiền mặt <MoneyText value={r.cashCollected} /> · chuyển khoản <MoneyText value={v - r.cashCollected} />
                  </Typography.Text>
                </div>
                {r.refunded > 0 && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      đã trừ hoàn <MoneyText value={r.refunded} />
                    </Typography.Text>
                  </div>
                )}
              </>
            ),
          },
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
            dataIndex: 'gap',
            // Nhãn theo dấu của chênh lệch backend: 0 khớp, âm thu rồi chưa nộp, dương xã trả lại công ty.
            render: (gap: number) =>
              gap === 0 ? (
                <StatusTag tone="success">Khớp</StatusTag>
              ) : gap < 0 ? (
                <StatusTag tone="warning">Thu rồi chưa nộp</StatusTag>
              ) : (
                <StatusTag tone="info">Xã trả lại công ty</StatusTag>
              ),
          },
        ]}
      />
    </>
  );
}
