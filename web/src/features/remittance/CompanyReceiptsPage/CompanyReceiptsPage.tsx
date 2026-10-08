import { Button, Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { DateText } from '../../../shared/DateText';
import {
  RECEIPT_ISSUE_STATUS_LABELS,
  RECEIPT_ISSUE_TYPE_LABELS,
  RECEIPT_METHOD_LABELS,
} from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { EmptyBlock, ErrorBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type Receipt, type ReceiptIssue, useCompanyLedger, useReceiptIssues, useReceipts } from '../api';
import { LedgerStats } from '../LedgerStats';
import { ISSUE_TONES } from '../tones';
import { ReportIssueModal } from './ReportIssueModal';

/**
 * "Phiếu thu xã lập" của công ty: chỉ phiếu của công ty mình (backend lọc), kèm lũy kế và còn phải nộp;
 * báo sai sót trên từng phiếu và theo dõi kết quả xã xử lý (G6: xã đóng kèm ghi chú, không sửa phiếu).
 */
export function CompanyReceiptsPage() {
  const [periodId, setPeriodId] = useState<number>();
  const [reporting, setReporting] = useState<Receipt | null>(null);
  const receipts = useReceipts(periodId);
  const ledger = useCompanyLedger(periodId);
  const issues = useReceiptIssues();
  const pending = new Set((issues.data ?? []).filter((i) => i.status === 'PENDING').map((i) => i.receiptId));
  const error = receipts.error ?? issues.error ?? ledger.error;

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
      </Space>
      {error && <ErrorBlock error={error} onRetry={() => void receipts.refetch()} />}
      <LedgerStats rows={ledger.data ?? []} />
      <Table<Receipt>
        rowKey="id"
        loading={receipts.isLoading}
        dataSource={receipts.data ?? []}
        pagination={false}
        locale={{ emptyText: <EmptyBlock title="Kỳ này chưa có phiếu thu" hint="Khi công ty nộp tiền, xã lập phiếu và phiếu hiện ở đây." /> }}
        columns={[
          { title: 'Số phiếu', dataIndex: 'code' },
          { title: 'Ngày nộp', dataIndex: 'receiptDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Hình thức', dataIndex: 'method', render: (m: Receipt['method']) => RECEIPT_METHOD_LABELS[m] },
          { title: 'Chứng từ', dataIndex: 'documentRef', render: (v: string | null) => v ?? '—' },
          { title: 'Lũy kế đã nộp', dataIndex: 'cumulativePaid', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Còn phải nộp', dataIndex: 'remainingAfter', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          {
            title: 'Trạng thái',
            render: (_, r) =>
              pending.has(r.id) ? (
                <StatusTag tone="warning">Đã báo sai sót · chờ xã kiểm tra</StatusTag>
              ) : (
                <StatusTag tone="success">Xã đã ghi nhận</StatusTag>
              ),
          },
          {
            title: '',
            render: (_, r) => (
              <Button size="small" onClick={() => setReporting(r)} disabled={pending.has(r.id)}>
                Báo sai sót
              </Button>
            ),
          },
        ]}
      />
      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Sai sót đã báo
      </Typography.Title>
      <Table<ReceiptIssue>
        rowKey="id"
        size="small"
        loading={issues.isLoading}
        dataSource={issues.data ?? []}
        pagination={false}
        locale={{ emptyText: <EmptyBlock title="Chưa báo sai sót nào" hint="Thấy phiếu ghi sai số tiền hay sai kỳ thì bấm Báo sai sót trên phiếu đó." /> }}
        columns={[
          { title: 'Phiếu', dataIndex: 'receiptCode' },
          { title: 'Loại', dataIndex: 'issueType', render: (t: ReceiptIssue['issueType']) => RECEIPT_ISSUE_TYPE_LABELS[t] },
          { title: 'Mô tả', dataIndex: 'description' },
          { title: 'Ngày báo', dataIndex: 'reportedAt', render: (d: string) => <DateText value={d} /> },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: ReceiptIssue['status']) => <StatusTag tone={ISSUE_TONES[s]}>{RECEIPT_ISSUE_STATUS_LABELS[s]}</StatusTag>,
          },
          { title: 'Kết quả xử lý', dataIndex: 'resolutionNote', render: (v: string | null) => v ?? '—' },
        ]}
      />
      <ReportIssueModal receipt={reporting} onClose={() => setReporting(null)} />
    </>
  );
}
