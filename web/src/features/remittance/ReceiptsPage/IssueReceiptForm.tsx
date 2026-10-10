import { Alert, DatePicker, Form, Input, InputNumber, Modal, Radio, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect } from 'react';

import type { components } from '../../../api/schema';
import { formatMoney } from '../../../shared/format';
import { RECEIPT_METHOD_LABELS, type ReceiptMethod } from '../../../shared/labels';
import { RemainingText } from '../../../shared/MoneyText';
import type { LedgerRow } from '../api';

export type IssueReceiptRequest = components['schemas']['IssueReceiptRequest'];

interface FormValues {
  amount?: number;
  method: ReceiptMethod;
  receiptDate?: Dayjs | null;
  payerName?: string;
  documentRef?: string;
  note?: string;
}

interface Props {
  row: LedgerRow | null;
  periodLabel?: string;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: IssueReceiptRequest) => void;
  onCancel: () => void;
}

/** Lập phiếu thu khi công ty nộp tiền (R15): 0 < số tiền ≤ còn phải nộp của kỳ (điền sẵn số đó), ngày không sau hôm nay. */
export function IssueReceiptForm({ row, periodLabel, submitting, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const method = Form.useWatch('method', form);
  const remaining = row?.remaining ?? 0;

  // Form dùng chung một store qua các lần mở: mỗi lần mở phiếu (đổi công ty) gán thẳng số đúng của công ty đó, không giữ
  // số đã gõ ở lần trước (chỉ dựa initialValues thì số chậm một lần mở).
  useEffect(() => {
    if (!row) return;
    form.resetFields();
    form.setFieldsValue({ amount: row.remaining > 0 ? row.remaining : undefined, method: 'TRANSFER', receiptDate: dayjs(), payerName: undefined, documentRef: undefined, note: undefined });
  }, [row, form]);

  function finish(v: FormValues) {
    onSubmit({
      companyId: row!.companyId,
      periodId: row!.periodId,
      amount: v.amount!,
      method: v.method,
      receiptDate: v.receiptDate?.format('YYYY-MM-DD'),
      payerName: v.payerName?.trim() || undefined,
      documentRef: v.documentRef?.trim() || undefined,
      note: v.note?.trim() || undefined,
    });
  }

  return (
    <Modal
      title={row ? `Lập phiếu thu · ${row.companyCode} · ${periodLabel ?? ''}` : 'Lập phiếu thu'}
      open={row !== null}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lập phiếu"
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={error} />}
      {row && (
        <Typography.Paragraph>
          {row.companyName} · còn phải nộp <RemainingText value={remaining} strong />
        </Typography.Paragraph>
      )}
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ amount: remaining > 0 ? remaining : undefined, method: 'TRANSFER', receiptDate: dayjs() }}
        onFinish={finish}
      >
        <Form.Item
          label="Số tiền"
          name="amount"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền' },
            { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' },
            { type: 'number', max: remaining, message: `Không vượt số còn phải nộp (${formatMoney(remaining)})` },
          ]}
        >
          <InputNumber<number>
            style={{ width: '100%' }}
            addonAfter="đ"
            formatter={(v) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
            parser={(v) => Number((v ?? '').replace(/\D/g, ''))}
          />
        </Form.Item>
        <Form.Item label="Hình thức" name="method" rules={[{ required: true, message: 'Vui lòng chọn hình thức' }]}>
          <Radio.Group
            optionType="button"
            options={(Object.keys(RECEIPT_METHOD_LABELS) as ReceiptMethod[]).map((m) => ({ value: m, label: RECEIPT_METHOD_LABELS[m] }))}
          />
        </Form.Item>
        <Form.Item label="Ngày nộp" name="receiptDate" rules={[{ required: true, message: 'Vui lòng chọn ngày nộp' }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
        </Form.Item>
        <Form.Item label="Người nộp" name="payerName" extra="Để trống thì lấy người đầu mối của công ty">
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label={method === 'TRANSFER' ? 'Số ủy nhiệm chi / mã giao dịch' : 'Số chứng từ'} name="documentRef">
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
