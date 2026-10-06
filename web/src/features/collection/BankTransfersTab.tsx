import { useQuery } from '@tanstack/react-query';
import { Table, Typography } from 'antd';

import { api } from '../../api/client';
import type { components } from '../../api/schema';
import { formatDate } from '../../shared/format';
import { MoneyText } from '../../shared/MoneyText';
import { PageHeader } from '../../shared/PageHeader';
import { ErrorBlock } from '../../shared/StateBlock';
import { StatusTag } from '../../shared/StatusTag';

type BankTransfer = components['schemas']['BankTransferDto'];

const REASON_LABELS: Record<NonNullable<BankTransfer['reason']>, string> = {
  NO_CODE: 'Nội dung không có mã khoản thu',
  CHARGE_NOT_FOUND: 'Mã khoản thu không tồn tại',
  WRONG_ACCOUNT: 'Tiền vào tài khoản không phải của xã (hoặc xã chưa khai tài khoản)',
  AMOUNT_MISMATCH: 'Số tiền khác số phải thu',
  CHARGE_NOT_COLLECTABLE: 'Khoản đã thu, được miễn, đã xóa nợ hoặc kỳ đã khóa mà chưa có kỳ đang thu',
};

/**
 * Chuyển khoản chờ đối chiếu (UC-27, cán bộ xã): giao dịch SePay báo về nhưng hệ thống không tự ghi được vào khoản thu nào
 * (sai số tiền, thiếu mã...). Chỉ để xem; cán bộ xã liên hệ hộ và công ty để xử lý.
 */
// ponytail: chưa có nút gắn giao dịch vào khoản / đánh dấu đã xử lý; thêm khi thực tế có phát sinh.
export function BankTransfersTab() {
  const transfers = useQuery({
    queryKey: ['collection', 'bank-transfers', 'unmatched'],
    queryFn: () => api.get<BankTransfer[]>('/api/collection/bank-transfers/unmatched'),
  });
  if (transfers.error) return <ErrorBlock error={transfers.error} onRetry={() => void transfers.refetch()} />;
  return (
    <>
      <Typography.Paragraph type="secondary">
        Tiền đã vào tài khoản của xã nhưng hệ thống không tự ghi nhận được. Khoản thu của hộ chưa đổi trạng thái; liên hệ hộ và
        công ty phụ trách để xử lý.
      </Typography.Paragraph>
      <Table<BankTransfer>
        rowKey="id"
        size="small"
        loading={transfers.isLoading}
        dataSource={transfers.data ?? []}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'Không có chuyển khoản nào chờ đối chiếu' }}
        columns={[
          { title: 'Thời gian', className: 'cell-nowrap', render: (_, t) => t.transactionDate ?? formatDate(t.createdAt, true) },
          { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Nội dung chuyển khoản', dataIndex: 'content' },
          { title: 'Ngân hàng', render: (_, t) => [t.gateway, t.accountNumber].filter(Boolean).join(' · ') || '—' },
          { title: 'Mã giao dịch', dataIndex: 'referenceCode', render: (v: string | null) => v ?? '—' },
          {
            title: 'Lý do chưa ghi nhận',
            dataIndex: 'reason',
            render: (r: BankTransfer['reason']) => <StatusTag tone="warning">{r ? REASON_LABELS[r] : '—'}</StatusTag>,
          },
        ]}
      />
    </>
  );
}

export function BankTransfersPage() {
  return (
    <>
      <PageHeader title="Chuyển khoản chờ đối chiếu" description="Giao dịch vào tài khoản của xã mà hệ thống chưa khớp được với khoản phải thu." />
      <BankTransfersTab />
    </>
  );
}
