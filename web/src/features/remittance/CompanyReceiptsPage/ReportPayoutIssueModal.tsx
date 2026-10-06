import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Descriptions, Form, Input, InputNumber, Modal, Select } from 'antd';

import { api } from '../../../api/client';
import { errorText } from '../../../shared/errorText';
import { RECEIPT_ISSUE_TYPE_LABELS, type ReceiptIssueType } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { type Payout, type PayoutIssue, remittanceKeys } from '../api';

interface Values {
  issueType: ReceiptIssueType;
  correctAmount?: number | null;
  description: string;
}

/** Công ty báo sai sót một phiếu chi trả xã lập cho mình (UC-56); xã nhận thông báo và kiểm tra. */
export function ReportPayoutIssueModal({ payout, onClose }: { payout: Payout | null; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Values>();
  const issueType = Form.useWatch('issueType', form);
  const report = useMutation({
    mutationFn: (v: Values) =>
      api.post<PayoutIssue>('/api/remittance/payout-issues', {
        payoutId: payout!.id,
        issueType: v.issueType,
        correctAmount: v.issueType === 'WRONG_AMOUNT' ? (v.correctAmount ?? null) : null,
        description: v.description,
      }),
    onSuccess: () => {
      message.success(`Đã báo sai sót phiếu ${payout!.code}, chờ xã kiểm tra`);
      void queryClient.invalidateQueries({ queryKey: remittanceKeys.payoutIssues });
      onClose();
    },
  });

  return (
    <Modal
      title={payout ? `Báo sai sót · ${payout.code}` : 'Báo sai sót'}
      open={payout !== null}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Gửi báo sai sót"
      cancelText="Hủy"
      confirmLoading={report.isPending}
      destroyOnHidden
    >
      {report.error && (
        <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={errorText(report.error, 'Không gửi được. Vui lòng thử lại.')} />
      )}
      {payout && (
        <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Kỳ">{payout.periodLabel}</Descriptions.Item>
          <Descriptions.Item label="Số tiền trên phiếu">
            <MoneyText value={payout.amount} />
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
          <Form.Item label="Số tiền đúng" name="correctAmount" rules={[{ type: 'number', min: 0, message: 'Số tiền không được âm' }]}>
            <InputNumber<number>
              style={{ width: '100%' }}
              addonAfter="đ"
              formatter={(v) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
              parser={(v) => Number((v ?? '').replace(/\D/g, ''))}
            />
          </Form.Item>
        )}
        <Form.Item label="Mô tả" name="description" rules={[{ required: true, whitespace: true, message: 'Vui lòng mô tả sai sót' }]}>
          <Input.TextArea rows={4} maxLength={1000} showCount placeholder="Ví dụ: nhận 4.500.000 đ, phiếu ghi 4.200.000 đ" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
