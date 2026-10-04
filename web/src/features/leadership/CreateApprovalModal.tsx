import { Alert, App, Form, Input, InputNumber, Modal, Typography } from 'antd';

import { ApiError } from '../../api/client';
import { formatMoney } from '../../shared/format';
import { MoneyText } from '../../shared/MoneyText';
import type { Charge } from '../billing/api';
import { useCreateApproval } from './api';

interface Values {
  amount?: number;
  reason?: string;
  decisionNo?: string;
}

interface Props {
  /** Khoản cần đề nghị; `null` là đóng. */
  target: { charge: Charge; type: 'REFUND' | 'WRITE_OFF' } | null;
  onClose: () => void;
}

/** Cán bộ xã lập đề nghị xóa nợ (khoản chưa thu) hoặc hoàn (khoản đã thu) để lãnh đạo duyệt (T57, T58). */
export function CreateApprovalModal({ target, onClose }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const create = useCreateApproval();
  const charge = target?.charge;
  const refund = target?.type === 'REFUND';
  // ChargeDto chưa có paidAmount: khoản Đã thu đã thu đủ số tiền, nên hạn mức hoàn = số tiền − đã hoàn (backend vẫn kiểm lại, BR-LD-05).
  const refundable = charge ? charge.amount - charge.refunded : 0;

  function close() {
    create.reset();
    onClose();
  }

  return (
    <Modal
      open={target !== null}
      title={refund ? 'Đề nghị hoàn tiền' : 'Đề nghị xóa nợ'}
      okText="Gửi lãnh đạo duyệt"
      cancelText="Hủy"
      confirmLoading={create.isPending}
      onOk={() => form.submit()}
      onCancel={close}
      destroyOnHidden
    >
      {create.error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 12 }}
          message={create.error instanceof ApiError ? create.error.message : 'Không gửi được. Vui lòng thử lại.'}
        />
      )}
      {charge && (
        <Typography.Paragraph type="secondary">
          {charge.subjectName} · {charge.subjectCode} · {charge.code} · khoản <MoneyText value={charge.amount} strong />
        </Typography.Paragraph>
      )}
      <Alert
        type="info"
        style={{ marginBottom: 12 }}
        message={
          refund
            ? 'Khi được duyệt: số "đã thu" của công ty giảm bằng số hoàn; công ty trả lại tiền cho hộ. Hoàn hết thì khoản về Chưa thu.'
            : 'Khi được duyệt: khoản chuyển "Đã xóa nợ", không còn tính vào số công ty phải thu / phải nộp. Kỳ đã khóa thì ghi vào kỳ đang thu.'
        }
      />
      <Form<Values>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ amount: refund ? refundable : undefined }}
        onFinish={(v) =>
          create.mutate(
            {
              type: target!.type,
              chargeId: charge!.id,
              amount: refund ? v.amount : undefined,
              reason: v.reason!.trim(),
              decisionNo: v.decisionNo?.trim() || undefined,
            },
            {
              onSuccess: (a) => {
                message.success(`Đã gửi đề nghị ${a.code} cho lãnh đạo`);
                close();
              },
            },
          )
        }
      >
        {refund && (
          <Form.Item
            name="amount"
            label="Số tiền hoàn"
            extra={charge && charge.refunded > 0 ? `Khoản này đã hoàn ${formatMoney(charge.refunded)}; tối đa hoàn thêm ${formatMoney(refundable)}.` : `Tối đa ${formatMoney(refundable)} (số đã thu).`}
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền hoàn' },
              { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' },
              { type: 'number', max: refundable, message: `Không vượt số đã thu còn lại (${formatMoney(refundable)})` },
            ]}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              addonAfter="đ"
              formatter={(v) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
              parser={(v) => Number((v ?? '').replace(/\D/g, ''))}
            />
          </Form.Item>
        )}
        <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true, message: 'Vui lòng ghi lý do' }]}>
          <Input.TextArea
            rows={3}
            maxLength={1000}
            showCount
            placeholder={refund ? 'Ví dụ: thu nhầm hộ bên cạnh, hộ đã nộp qua app' : 'Ví dụ: hộ đã chuyển đi từ 08/2026, không liên lạc được'}
          />
        </Form.Item>
        <Form.Item name="decisionNo" label="Số văn bản (nếu có)">
          <Input maxLength={50} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
