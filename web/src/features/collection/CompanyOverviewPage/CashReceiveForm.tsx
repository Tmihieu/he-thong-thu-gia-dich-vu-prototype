import { Alert, DatePicker, Form, Input, InputNumber, Modal, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { formatMoney } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import type { CashHeld } from '../api';

interface FormValues {
  amount?: number;
  handoverDate?: Dayjs | null;
  note?: string;
}

export interface CashReceiveRequest {
  collectorId: number;
  amount: number;
  handoverDate: string;
  note?: string;
}

interface Props {
  collector: CashHeld | null;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: CashReceiveRequest) => void;
  onCancel: () => void;
}

/** Popup "Nhận tiền mặt" từ người đi thu (G5): số tiền không vượt số đang giữ, ngày không sau hôm nay. */
export function CashReceiveForm({ collector, submitting, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const held = collector?.held ?? 0;

  function finish(v: FormValues) {
    onSubmit({
      collectorId: collector!.collectorId,
      amount: v.amount!,
      handoverDate: v.handoverDate!.format('YYYY-MM-DD'),
      note: v.note?.trim() || undefined,
    });
  }

  return (
    <Modal
      title={collector ? `Nhận tiền mặt · ${collector.collectorName}` : 'Nhận tiền mặt'}
      open={collector !== null}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Xác nhận đã nhận"
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={error} />}
      <Typography.Paragraph>
        Đang giữ: <MoneyText value={held} strong />
      </Typography.Paragraph>
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ amount: held || undefined, handoverDate: dayjs() }}
        onFinish={finish}
      >
        <Form.Item
          label="Số tiền nhận"
          name="amount"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền' },
            { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' },
            { type: 'number', max: held, message: `Không vượt số đang giữ (${formatMoney(held)})` },
          ]}
        >
          <InputNumber<number>
            style={{ width: '100%' }}
            addonAfter="đ"
            formatter={(v) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
            parser={(v) => Number((v ?? '').replace(/\D/g, ''))}
          />
        </Form.Item>
        <Form.Item label="Ngày nhận" name="handoverDate" rules={[{ required: true, message: 'Vui lòng chọn ngày nhận' }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
        </Form.Item>
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
