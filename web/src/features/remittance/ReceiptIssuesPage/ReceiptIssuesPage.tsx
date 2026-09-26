import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Descriptions, Form, Input, Modal, Segmented, Space, Table, Tag } from 'antd';
import { useState } from 'react';

import { api, ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import {
  RECEIPT_ISSUE_STATUS_COLORS,
  RECEIPT_ISSUE_STATUS_LABELS,
  RECEIPT_ISSUE_TYPE_LABELS,
  type ReceiptIssueStatus,
} from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { type ReceiptIssue, remittanceKeys, useReceiptIssues } from '../api';

function ResolveModal({ issue, onClose }: { issue: ReceiptIssue | null; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ resolutionNote: string }>();
  const resolve = useMutation({
    mutationFn: (v: { resolutionNote: string }) =>
      api.post<ReceiptIssue>(`/api/remittance/receipt-issues/${issue!.id}/resolve`, v),
    onSuccess: () => {
      message.success(`Đã xử lý sai sót phiếu ${issue!.receiptCode}, đã báo ${issue!.companyCode}`);
      void queryClient.invalidateQueries({ queryKey: remittanceKeys.receiptIssues });
      onClose();
    },
  });

  return (
    <Modal
      title={issue ? `Xử lý sai sót · ${issue.receiptCode}` : 'Xử lý sai sót'}
      open={issue !== null}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Đánh dấu đã xử lý"
      cancelText="Hủy"
      confirmLoading={resolve.isPending}
      destroyOnHidden
    >
      {resolve.error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 12 }}
          message={resolve.error instanceof ApiError ? resolve.error.message : 'Không lưu được. Vui lòng thử lại.'}
        />
      )}
      {issue && (
        <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Công ty">{`${issue.companyCode} · ${issue.companyName}`}</Descriptions.Item>
          <Descriptions.Item label="Phiếu">
            {issue.receiptCode} · {issue.periodLabel} · <MoneyText value={issue.receiptAmount} />
          </Descriptions.Item>
          <Descriptions.Item label="Loại">{RECEIPT_ISSUE_TYPE_LABELS[issue.issueType]}</Descriptions.Item>
          {issue.correctAmount !== null && (
            <Descriptions.Item label="Số đúng theo công ty">
              <MoneyText value={issue.correctAmount} />
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Mô tả">{issue.description}</Descriptions.Item>
        </Descriptions>
      )}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Phiếu đã lập không sửa, không hủy. Nếu thiếu tiền, lập thêm phiếu mới rồi ghi lại ở đây."
      />
      <Form form={form} layout="vertical" onFinish={(v) => resolve.mutate(v)} preserve={false}>
        <Form.Item
          label="Kết quả xử lý"
          name="resolutionNote"
          rules={[{ required: true, whitespace: true, message: 'Vui lòng ghi kết quả xử lý' }]}
        >
          <Input.TextArea rows={4} maxLength={1000} showCount placeholder="Ví dụ: đã kiểm tra sao kê, phiếu đúng" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** Màn mới (prototype chưa có): cán bộ xã xem sai sót phiếu thu công ty báo và đóng kèm ghi chú (G6). */
export function ReceiptIssuesPage() {
  const [status, setStatus] = useState<ReceiptIssueStatus | 'ALL'>('PENDING');
  const [resolving, setResolving] = useState<ReceiptIssue | null>(null);
  const issues = useReceiptIssues(status === 'ALL' ? undefined : status);

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Segmented<ReceiptIssueStatus | 'ALL'>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'PENDING', label: 'Chờ xử lý' },
            { value: 'RESOLVED', label: 'Đã xử lý' },
            { value: 'ALL', label: 'Tất cả' },
          ]}
        />
      </Space>
      {issues.error && (
        <Alert
          type="error"
          showIcon
          message={issues.error instanceof ApiError ? issues.error.message : 'Không tải được danh sách sai sót'}
        />
      )}
      <Table<ReceiptIssue>
        rowKey="id"
        loading={issues.isLoading}
        dataSource={issues.data ?? []}
        pagination={false}
        locale={{ emptyText: status === 'PENDING' ? 'Không có sai sót nào chờ xử lý' : 'Không có sai sót' }}
        columns={[
          { title: 'Công ty', dataIndex: 'companyCode' },
          { title: 'Phiếu', render: (_, i) => `${i.receiptCode} · ${i.periodLabel}` },
          { title: 'Số tiền phiếu', dataIndex: 'receiptAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Loại', dataIndex: 'issueType', render: (t: ReceiptIssue['issueType']) => RECEIPT_ISSUE_TYPE_LABELS[t] },
          { title: 'Mô tả', dataIndex: 'description' },
          { title: 'Ngày báo', dataIndex: 'reportedAt', render: (d: string) => <DateText value={d} /> },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: ReceiptIssue['status']) => <Tag color={RECEIPT_ISSUE_STATUS_COLORS[s]}>{RECEIPT_ISSUE_STATUS_LABELS[s]}</Tag>,
          },
          {
            title: '',
            render: (_, i) =>
              i.status === 'PENDING' ? (
                <Button size="small" type="primary" onClick={() => setResolving(i)}>
                  Xử lý
                </Button>
              ) : (
                i.resolutionNote
              ),
          },
        ]}
      />
      <ResolveModal issue={resolving} onClose={() => setResolving(null)} />
    </>
  );
}
