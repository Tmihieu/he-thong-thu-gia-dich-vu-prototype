import { Alert, Button, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import {
  RECEIPT_ISSUE_STATUS_COLORS,
  RECEIPT_ISSUE_STATUS_LABELS,
  RECEIPT_ISSUE_TYPE_LABELS,
  RECEIPT_METHOD_LABELS,
} from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type Receipt, type ReceiptIssue, useReceiptIssues, useReceipts } from '../api';
import { ReportIssueModal } from './ReportIssueModal';

/**
 * "Phiếu thu xã lập" của công ty: chỉ phiếu của công ty mình (backend lọc), kèm lũy kế và còn phải nộp;
 * báo sai sót trên từng phiếu và theo dõi kết quả xã xử lý (G6: xã đóng kèm ghi chú, không sửa phiếu).
 */
export function CompanyReceiptsPage() {
  const [periodId, setPeriodId] = useState<number>();
  const [reporting, setReporting] = useState<Receipt | null>(null);
  const receipts = useReceipts(periodId);
  const issues = useReceiptIssues();
  const pending = new Set((issues.data ?? []).filter((i) => i.status === 'PENDING').map((i) => i.receiptId));
  const error = receipts.error ?? issues.error;

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
      </Space>
      {error && (
        <Alert type="error" showIcon message={error instanceof ApiError ? error.message : 'Không tải được phiếu thu'} />
      )}
      <Table<Receipt>
        rowKey="id"
        loading={receipts.isLoading}
        dataSource={receipts.data ?? []}
        pagination={false}
        locale={{ emptyText: 'Kỳ này xã chưa lập phiếu thu nào cho công ty' }}
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
              pending.has(r.id) ? <Tag color="orange">Đã báo sai sót · chờ xã kiểm tra</Tag> : <Tag color="green">Xã đã ghi nhận</Tag>,
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
        locale={{ emptyText: 'Chưa báo sai sót nào' }}
        columns={[
          { title: 'Phiếu', dataIndex: 'receiptCode' },
          { title: 'Loại', dataIndex: 'issueType', render: (t: ReceiptIssue['issueType']) => RECEIPT_ISSUE_TYPE_LABELS[t] },
          { title: 'Mô tả', dataIndex: 'description' },
          { title: 'Ngày báo', dataIndex: 'reportedAt', render: (d: string) => <DateText value={d} /> },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: ReceiptIssue['status']) => <Tag color={RECEIPT_ISSUE_STATUS_COLORS[s]}>{RECEIPT_ISSUE_STATUS_LABELS[s]}</Tag>,
          },
          { title: 'Kết quả xử lý', dataIndex: 'resolutionNote', render: (v: string | null) => v ?? '—' },
        ]}
      />
      <ReportIssueModal receipt={reporting} onClose={() => setReporting(null)} />
    </>
  );
}
