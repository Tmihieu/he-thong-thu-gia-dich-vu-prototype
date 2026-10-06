import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { api } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { errorText as apiErrorText } from '../../../shared/errorText';
import { MoneyText } from '../../../shared/MoneyText';
import { ErrorBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { usePeriods } from '../../masterdata/api';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type LedgerRow, type Payout, useCompanyLedger, usePayouts } from '../api';
import { RemainingText } from '../RemainingText';
import { IssuePayoutForm, type IssuePayoutRequest } from './IssuePayoutForm';
import { PayoutPrint } from './PayoutPrint';

const errorText = (e: unknown) => (e ? apiErrorText(e) : null);

function CompanyPayouts({ periodId, companyId, onPrint }: { periodId: number; companyId: number; onPrint: (p: Payout) => void }) {
  const payouts = usePayouts(periodId, companyId);
  return (
    <Table<Payout>
      size="small"
      rowKey="id"
      loading={payouts.isLoading}
      dataSource={payouts.data ?? []}
      pagination={false}
      locale={{ emptyText: 'Chưa có phiếu chi trả' }}
      columns={[
        { title: 'Số phiếu', dataIndex: 'code' },
        { title: 'Ngày trả', dataIndex: 'payoutDate', render: (d: string) => <DateText value={d} /> },
        { title: 'Số tiền', dataIndex: 'amount', render: (v: number) => <MoneyText value={v} /> },
        { title: 'Lũy kế đã trả', dataIndex: 'cumulativePaid', render: (v: number) => <MoneyText value={v} /> },
        { title: 'Xã còn phải trả', dataIndex: 'remainingAfter', render: (v: number) => <MoneyText value={v} /> },
        {
          title: '',
          render: (_, p) => (
            <Button size="small" onClick={() => onPrint(p)} aria-label={`In ${p.code}`}>
              In
            </Button>
          ),
        },
      ]}
    />
  );
}

/**
 * Phiếu chi trả công ty (UC-55) của cán bộ xã: công ty có phải nộp xã âm trong kỳ (xã trả lại), lập phiếu chi,
 * lịch sử và bản in. Lãnh đạo xem qua API và số trên Tiến độ thu / Đối soát (không có tab này).
 */
export function PayoutsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [periodId, setPeriodId] = useState<number>();
  const [issuing, setIssuing] = useState<LedgerRow | null>(null);
  const [printing, setPrinting] = useState<Payout | null>(null);
  const ledger = useCompanyLedger(periodId);
  const period = usePeriods().data?.find((p) => p.id === periodId);
  const locked = period?.status === 'LOCKED';
  const rows = (ledger.data ?? []).filter((r) => r.communePaid > 0 || r.communeOwed > 0);
  const issue = useMutation({
    mutationFn: (req: IssuePayoutRequest) => api.post<Payout>('/api/remittance/payouts', req),
    onSuccess: (p) => {
      message.success(`Đã lập phiếu chi ${p.code} cho ${p.companyCode}`);
      void queryClient.invalidateQueries({ queryKey: ['remittance'] });
      setIssuing(null);
      setPrinting(p);
    },
  });

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
        {locked && <StatusTag tone="neutral">Kỳ đã khóa, không lập thêm phiếu</StatusTag>}
      </Space>
      {ledger.error && <ErrorBlock error={ledger.error} onRetry={() => void ledger.refetch()} />}
      <Table<LedgerRow>
        rowKey="companyId"
        loading={ledger.isLoading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: 'Kỳ này xã không phải trả lại công ty nào' }}
        expandable={{
          expandedRowRender: (r) => <CompanyPayouts periodId={r.periodId} companyId={r.companyId} onPrint={setPrinting} />,
          rowExpandable: (r) => r.communePaid > 0,
        }}
        columns={[
          { title: 'Công ty', render: (_, r) => `${r.companyCode} · ${r.companyName}` },
          { title: 'Xã phải trả lại', dataIndex: 'remaining', render: (v: number) => <MoneyText value={Math.max(0, -v)} /> },
          { title: 'Xã đã trả', dataIndex: 'communePaid', render: (v: number) => <MoneyText value={v} /> },
          {
            title: 'Xã còn phải trả',
            dataIndex: 'communeOwed',
            render: (v: number, r) =>
              v > 0 ? <MoneyText value={v} strong /> : <RemainingText value={r.remaining} paid={r.communePaid} />,
          },
          {
            title: '',
            render: (_: unknown, r: LedgerRow) => (
              <Button
                size="small"
                type="primary"
                disabled={locked || r.communeOwed <= 0}
                onClick={() => setIssuing(r)}
                aria-label={`Lập phiếu chi ${r.companyCode}`}
              >
                Lập phiếu chi
              </Button>
            ),
          },
        ]}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        Chỉ hiện công ty có phải nộp xã âm trong kỳ (xã trả lại phần chênh). Số xã còn phải trả = số xã trả lại − tổng các phiếu chi đã lập.
      </Typography.Paragraph>
      <IssuePayoutForm
        row={issuing}
        periodLabel={period?.label}
        submitting={issue.isPending}
        error={errorText(issue.error)}
        onCancel={() => {
          setIssuing(null);
          issue.reset();
        }}
        onSubmit={(req) => issue.mutate(req)}
      />
      <PayoutPrint payout={printing} onClose={() => setPrinting(null)} />
    </>
  );
}
