import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { api, ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { PROGRESS_COLORS, PROGRESS_LABELS, RECEIPT_METHOD_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { usePeriods } from '../../masterdata/api';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type LedgerRow, type Receipt, useCompanyLedger, useReceipts } from '../api';
import { IssueReceiptForm, type IssueReceiptRequest } from './IssueReceiptForm';
import { ReceiptPrint } from './ReceiptPrint';

function errorText(e: unknown) {
  return e ? (e instanceof ApiError ? e.message : 'Không thực hiện được. Vui lòng thử lại.') : null;
}

function CompanyReceipts({ periodId, companyId, onPrint }: { periodId: number; companyId: number; onPrint: (r: Receipt) => void }) {
  const receipts = useReceipts(periodId, companyId);
  return (
    <Table<Receipt>
      size="small"
      rowKey="id"
      loading={receipts.isLoading}
      dataSource={receipts.data ?? []}
      pagination={false}
      locale={{ emptyText: 'Chưa có phiếu thu' }}
      columns={[
        { title: 'Số phiếu', dataIndex: 'code' },
        { title: 'Ngày nộp', dataIndex: 'receiptDate', render: (d: string) => <DateText value={d} /> },
        { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        { title: 'Hình thức', dataIndex: 'method', render: (m: Receipt['method']) => RECEIPT_METHOD_LABELS[m] },
        { title: 'Lũy kế', dataIndex: 'cumulativePaid', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        {
          title: '',
          render: (_, r) => (
            <Button size="small" onClick={() => onPrint(r)} aria-label={`In ${r.code}`}>
              In
            </Button>
          ),
        },
      ]}
    />
  );
}

/** Phiếu thu công ty của cán bộ xã (§10 bước 5): công ty – kỳ còn phải nộp, lập phiếu, lịch sử và bản in. */
export function ReceiptsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [periodId, setPeriodId] = useState<number>();
  const [issuing, setIssuing] = useState<LedgerRow | null>(null);
  const [printing, setPrinting] = useState<Receipt | null>(null);
  const ledger = useCompanyLedger(periodId);
  const period = usePeriods().data?.find((p) => p.id === periodId);
  const locked = period?.status === 'LOCKED';
  const issue = useMutation({
    mutationFn: (req: IssueReceiptRequest) => api.post<Receipt>('/api/remittance/receipts', req),
    onSuccess: (r) => {
      message.success(`Đã lập phiếu ${r.code} cho ${r.companyCode}`);
      void queryClient.invalidateQueries({ queryKey: ['remittance'] });
      setIssuing(null);
      setPrinting(r);
    },
  });

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
        {locked && <Tag>Kỳ đã khóa, không lập thêm phiếu</Tag>}
      </Space>
      {ledger.error && <Alert type="error" showIcon message={errorText(ledger.error)} style={{ marginBottom: 12 }} />}
      <Table<LedgerRow>
        rowKey="companyId"
        loading={ledger.isLoading}
        dataSource={ledger.data ?? []}
        pagination={false}
        locale={{ emptyText: 'Kỳ này chưa có khoản phải thu' }}
        expandable={{
          expandedRowRender: (r) => (
            <CompanyReceipts periodId={r.periodId} companyId={r.companyId} onPrint={setPrinting} />
          ),
          rowExpandable: (r) => r.receiptCount > 0,
        }}
        columns={[
          { title: 'Công ty', render: (_, r) => `${r.companyCode} · ${r.companyName}` },
          { title: 'Phải thu', dataIndex: 'due', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Đã thu của hộ', dataIndex: 'collected', align: 'right', render: (v: number) => <MoneyText value={v} /> },
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
          { title: 'Còn phải nộp', dataIndex: 'remaining', align: 'right', render: (v: number) => <MoneyText value={v} strong /> },
          {
            title: 'Tiến độ',
            dataIndex: 'progress',
            render: (p: LedgerRow['progress']) => <Tag color={PROGRESS_COLORS[p]}>{PROGRESS_LABELS[p]}</Tag>,
          },
          {
            title: '',
            render: (_, r) => (
              <Button
                size="small"
                type="primary"
                disabled={locked || r.remaining <= 0}
                onClick={() => setIssuing(r)}
                aria-label={`Lập phiếu ${r.companyCode}`}
              >
                Lập phiếu
              </Button>
            ),
          },
        ]}
      />
      <IssueReceiptForm
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
      <ReceiptPrint receipt={printing} onClose={() => setPrinting(null)} />
    </>
  );
}
