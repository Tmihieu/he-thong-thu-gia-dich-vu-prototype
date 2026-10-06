import { Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

import { useAuth } from '../../../app/auth/authContext';
import { MoneyText } from '../../../shared/MoneyText';
import { PageHeader } from '../../../shared/PageHeader';
import { StatCard, StatGrid } from '../../../shared/StatCard';
import { ErrorBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type LedgerRow, useCompanyLedger } from '../api';
import { PreviousDebtAlert } from '../PreviousDebtAlert';
import { LockPeriodButton } from './LockPeriodButton';
import { PeriodTrend } from './PeriodTrend';

/** Các cột số rộng bằng nhau; mọi ô căn giữa cả chiều ngang lẫn chiều dọc, kể cả ô hai dòng (đã nộp, đã trừ hoàn). */
const centered = (cols: ColumnsType<LedgerRow>): ColumnsType<LedgerRow> =>
  cols.map((c, i) => ({ ...c, align: i === 0 ? 'left' : 'center', width: i === 0 ? 200 : 140, onCell: () => ({ style: { verticalAlign: 'middle' } }) }));

function Gap({ gap }: { gap: number }) {
  if (gap === 0) return <MoneyText value={0} />;
  return (
    <Space direction="vertical" size={0} style={{ textAlign: 'center' }}>
      <Typography.Text type={gap < 0 ? 'danger' : undefined}>
        <MoneyText value={gap} />
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {gap < 0 ? 'thu rồi chưa nộp' : 'xã trả lại công ty'}
      </Typography.Text>
    </Space>
  );
}

/** Kết quả đối soát (R14) theo trạng thái backend: Khớp / Đang nộp (trong hạn) / Lệch (hết hạn còn thiếu hoặc kỳ trước còn nợ). */
const RECONCILIATION: Record<LedgerRow['reconciliation'], { tone: 'success' | 'warning' | 'danger'; label: string }> = {
  MATCHED: { tone: 'success', label: 'Khớp' },
  PENDING: { tone: 'warning', label: 'Đang nộp' },
  MISMATCH: { tone: 'danger', label: 'Lệch' },
};

/**
 * Đối soát (R14, UC-38): phải thu / đã thu tiền mặt / đã thu chuyển khoản / phí thu gom công ty hưởng / điều chỉnh / phải nộp
 * xã / đã nộp về xã / chênh lệch = đã nộp − phải nộp xã / kết quả. Kỳ trước chưa khóa hiện ở cảnh báo đầu trang, không còn
 * cột riêng. Cán bộ xã khóa kỳ từ màn này (G1, UC-39).
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
      <PreviousDebtAlert rows={rows} />
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
        tableLayout="fixed"
        scroll={{ x: 1400 }}
        columns={centered([
          { title: 'Công ty', dataIndex: 'companyName' },
          { title: 'Phải thu', dataIndex: 'due', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          {
            title: 'Đã thu tiền mặt',
            dataIndex: 'cashCollected',
            align: 'right',
            render: (v: number, r) => (
              <>
                <MoneyText value={v} />
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
            title: 'Đã thu chuyển khoản',
            align: 'right',
            render: (_, r) => <MoneyText value={r.collected - r.cashCollected} />,
          },
          { title: 'Phí thu gom công ty hưởng', dataIndex: 'retained', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Điều chỉnh', dataIndex: 'adjustment', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Phải nộp xã', dataIndex: 'payable', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          {
            title: 'Đã nộp',
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
            title: 'Kết quả',
            dataIndex: 'reconciliation',
            render: (v: LedgerRow['reconciliation']) => <StatusTag tone={RECONCILIATION[v].tone}>{RECONCILIATION[v].label}</StatusTag>,
          },
        ])}
      />
    </>
  );
}
