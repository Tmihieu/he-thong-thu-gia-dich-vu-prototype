import { Alert, DatePicker, Form, Input, InputNumber, Modal, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import type { components } from '../../../api/schema';
import { formatMoney } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import type { LedgerRow } from '../api';

export type IssuePayoutRequest = components['schemas']['IssuePayoutRequest'];

interface FormValues {
  amount?: number;
  payoutDate?: Dayjs | null;
  note?: string;
}

interface Props {
  row: LedgerRow | null;
  periodLabel?: string;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: IssuePayoutRequest) => void;
  onCancel: () => void;
}

/** Lập phiếu chi trả công ty (UC-55): 0 < số tiền ≤ số xã còn phải trả của kỳ, ngày không sau hôm nay. */
export function IssuePayoutForm({ row, periodLabel, submitting, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const owed = row?.communeOwed ?? 0;

  function finish(v: FormValues) {
    onSubmit({
      companyId: row!.companyId,
      periodId: row!.periodId,
      amount: v.amount!,
      payoutDate: v.payoutDate?.format('YYYY-MM-DD'),
      note: v.note?.trim() || undefined,
    });
  }

  return (
    <Modal
      title={row ? `Lập phiếu chi trả · ${row.companyCode} · ${periodLabel ?? ''}` : 'Lập phiếu chi trả'}
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
          {row.companyName} · xã còn phải trả <MoneyText value={owed} strong />
        </Typography.Paragraph>
      )}
      <Form<FormValues> form={form} layout="vertical" preserve={false} initialValues={{ payoutDate: dayjs() }} onFinish={finish}>
        <Form.Item
          label="Số tiền"
          name="amount"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền' },
            { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' },
            { type: 'number', max: owed, message: `Không vượt số xã còn phải trả (${formatMoney(owed)})` },
          ]}
        >
          <InputNumber<number>
            style={{ width: '100%' }}
            addonAfter="đ"
            formatter={(v) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
            parser={(v) => Number((v ?? '').replace(/\D/g, ''))}
          />
        </Form.Item>
        <Form.Item label="Ngày trả" name="payoutDate" rules={[{ required: true, message: 'Vui lòng chọn ngày trả' }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
        </Form.Item>
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
