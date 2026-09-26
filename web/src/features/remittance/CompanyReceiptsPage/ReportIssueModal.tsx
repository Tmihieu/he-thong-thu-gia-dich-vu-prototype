import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Descriptions, Form, Input, InputNumber, Modal, Select } from 'antd';

import { api, ApiError } from '../../../api/client';
import { RECEIPT_ISSUE_TYPE_LABELS, type ReceiptIssueType } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { type Receipt, type ReceiptIssue, remittanceKeys } from '../api';

interface Values {
  issueType: ReceiptIssueType;
  correctAmount?: number | null;
  description: string;
}

interface Props {
  receipt: Receipt | null;
  onClose: () => void;
}

/** Công ty báo sai sót một phiếu thu xã lập (R28); xã nhận thông báo và kiểm tra. */
export function ReportIssueModal({ receipt, onClose }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Values>();
  const issueType = Form.useWatch('issueType', form);
  const report = useMutation({
    mutationFn: (v: Values) =>
      api.post<ReceiptIssue>('/api/remittance/receipt-issues', {
        receiptId: receipt!.id,
        issueType: v.issueType,
        correctAmount: v.issueType === 'WRONG_AMOUNT' ? (v.correctAmount ?? null) : null,
        description: v.description,
      }),
    onSuccess: () => {
      message.success(`Đã báo sai sót phiếu ${receipt!.code}, chờ xã kiểm tra`);
      void queryClient.invalidateQueries({ queryKey: remittanceKeys.receiptIssues });
      onClose();
    },
  });

  return (
    <Modal
      title={receipt ? `Báo sai sót · ${receipt.code}` : 'Báo sai sót'}
      open={receipt !== null}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Gửi báo sai sót"
      cancelText="Hủy"
      confirmLoading={report.isPending}
      destroyOnHidden
    >
      {report.error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 12 }}
          message={report.error instanceof ApiError ? report.error.message : 'Không gửi được. Vui lòng thử lại.'}
        />
      )}
      {receipt && (
        <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Kỳ">{receipt.periodLabel}</Descriptions.Item>
          <Descriptions.Item label="Số tiền trên phiếu">
            <MoneyText value={receipt.amount} />
          </Descriptions.Item>
        </Descriptions>
      )}
      <Form<Values> form={form} layout="vertical" onFinish={(v) => report.mutate(v)} preserve={false}>
        <Form.Item label="Loại sai sót" name="issueType" rules={[{ required: true, message: 'Vui lòng chọn loại sai sót' }]}>
          <Select
            placeholder="Chọn loại sai sót"
            options={Object.entries(RECEIPT_ISSUE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Form.Item>
        {issueType === 'WRONG_AMOUNT' && (
          <Form.Item
            label="Số tiền đúng"
            name="correctAmount"
            rules={[{ type: 'number', min: 0, message: 'Số tiền không được âm' }]}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              addonAfter="đ"
              formatter={(v) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
              parser={(v) => Number((v ?? '').replace(/\D/g, ''))}
            />
          </Form.Item>
        )}
        <Form.Item
          label="Mô tả"
          name="description"
          rules={[{ required: true, whitespace: true, message: 'Vui lòng mô tả sai sót' }]}
        >
          <Input.TextArea rows={4} maxLength={1000} showCount placeholder="Ví dụ: chuyển 4.500.000 đ, phiếu ghi 4.200.000 đ" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
