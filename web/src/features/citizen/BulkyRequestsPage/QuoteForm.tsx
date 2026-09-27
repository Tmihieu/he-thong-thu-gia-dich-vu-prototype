import { Alert, DatePicker, Form, Input, InputNumber, Modal, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { BULKY_ITEM_LABELS, type BulkyRequest } from '../api';

interface QuoteValues {
  fee?: number;
  scheduledDate?: Dayjs | null;
}

interface QuoteProps {
  request: BulkyRequest | null;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: { id: number; fee: number; scheduledDate: string }) => void;
  onCancel: () => void;
}

function summary(r: BulkyRequest) {
  return `${r.subjectCode} · ${r.quantity} × ${BULKY_ITEM_LABELS[r.itemType]}${r.itemDescription ? ` (${r.itemDescription})` : ''}`;
}

/** Công ty báo phí thu gom rác cồng kềnh: phí > 0, ngày hẹn mặc định ngày hộ mong muốn, không trước hôm nay. */
export function QuoteForm({ request, submitting, error, onSubmit, onCancel }: QuoteProps) {
  const [form] = Form.useForm<QuoteValues>();
  const preferred = request ? dayjs(request.preferredDate) : null;

  return (
    <Modal
      title={request ? `Báo phí · ${request.code}` : 'Báo phí'}
      open={request !== null}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Gửi báo phí"
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={error} />}
      {request && <Typography.Paragraph>{summary(request)}</Typography.Paragraph>}
      <Form<QuoteValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ scheduledDate: preferred && !preferred.isBefore(dayjs(), 'day') ? preferred : dayjs() }}
        onFinish={(v) => onSubmit({ id: request!.id, fee: v.fee!, scheduledDate: v.scheduledDate!.format('YYYY-MM-DD') })}
      >
        <Form.Item
          label="Phí thu gom"
          name="fee"
          extra="Hộ trả trực tiếp cho công ty khi thu gom, không thành khoản phải thu của xã."
          rules={[
            { required: true, message: 'Vui lòng nhập phí thu gom' },
            { type: 'number', min: 1, message: 'Phí phải lớn hơn 0' },
            { type: 'number', max: 10_000_000, message: 'Phí tối đa 10.000.000 đ' },
          ]}
        >
          <InputNumber<number>
            style={{ width: '100%' }}
            addonAfter="đ"
            formatter={(v) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
            parser={(v) => Number((v ?? '').replace(/\D/g, ''))}
          />
        </Form.Item>
        <Form.Item label="Ngày hẹn thu gom" name="scheduledDate" rules={[{ required: true, message: 'Vui lòng chọn ngày hẹn' }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isBefore(dayjs(), 'day') || d.isAfter(dayjs().add(30, 'day'), 'day')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

interface CancelProps {
  request: BulkyRequest | null;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: { id: number; reason: string }) => void;
  onCancel: () => void;
}

/** Công ty từ chối yêu cầu, bắt buộc ghi lý do (hộ nhận thông báo kèm lý do). */
export function RejectForm({ request, submitting, error, onSubmit, onCancel }: CancelProps) {
  const [form] = Form.useForm<{ reason: string }>();
  return (
    <Modal
      title={request ? `Từ chối · ${request.code}` : 'Từ chối'}
      open={request !== null}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Từ chối yêu cầu"
      okButtonProps={{ danger: true }}
      cancelText="Đóng"
      confirmLoading={submitting}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={error} />}
      {request && <Typography.Paragraph>{summary(request)}</Typography.Paragraph>}
      <Form form={form} layout="vertical" preserve={false} onFinish={(v) => onSubmit({ id: request!.id, reason: v.reason.trim() })}>
        <Form.Item
          label="Lý do"
          name="reason"
          rules={[{ required: true, whitespace: true, message: 'Vui lòng ghi lý do từ chối' }]}
        >
          <Input.TextArea rows={3} maxLength={255} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
