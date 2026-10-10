import { Alert, DatePicker, Descriptions, Form, Input, Modal, Radio } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect } from 'react';

import type { components } from '../../../api/schema';
import { RECEIPT_METHOD_LABELS, type ReceiptMethod, settlementDirection } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import type { LedgerRow } from '../api';

export type IssueSettlementRequest = components['schemas']['IssueSettlementRequest'];

interface FormValues {
  method?: ReceiptMethod;
  settleDate?: Dayjs | null;
  representativeName?: string;
  documentRef?: string;
  note?: string;
}

interface Props {
  row: LedgerRow | null;
  periodLabel?: string;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: IssueSettlementRequest) => void;
  onCancel: () => void;
}

/**
 * Lập phiếu quyết toán của một công ty trong kỳ: ba số do máy chủ tính, form chỉ hiện để đối chiếu
 * (công ty phải nộp = phải nộp xã + thu gom QR, xã phải trả = thu gom QR, chênh lệch = phải nộp xã).
 * Hình thức chỉ bắt buộc khi chênh lệch khác 0; ngày quyết toán không sau hôm nay.
 */
export function SettlementForm({ row, periodLabel, submitting, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const method = Form.useWatch('method', form);
  const diff = row?.payable ?? 0;

  // Form dùng chung một store qua các lần mở: mỗi lần mở (đổi công ty) đặt lại giá trị mặc định.
  useEffect(() => {
    if (!row) return;
    form.resetFields();
    form.setFieldsValue({ method: 'TRANSFER', settleDate: dayjs(), representativeName: undefined, documentRef: undefined, note: undefined });
  }, [row, form]);

  function finish(v: FormValues) {
    onSubmit({
      companyId: row!.companyId,
      periodId: row!.periodId,
      method: diff !== 0 ? v.method : undefined,
      settleDate: v.settleDate?.format('YYYY-MM-DD'),
      representativeName: v.representativeName?.trim() || undefined,
      documentRef: v.documentRef?.trim() || undefined,
      note: v.note?.trim() || undefined,
    });
  }

  return (
    <Modal
      title={row ? `Lập phiếu quyết toán · ${row.companyCode} · ${periodLabel ?? ''}` : 'Lập phiếu quyết toán'}
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
        <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }} title={row.companyName}>
          <Descriptions.Item label="Công ty phải nộp xã">
            <MoneyText value={row.payable + row.qrCollection} />
          </Descriptions.Item>
          <Descriptions.Item label="Xã phải trả công ty">
            <MoneyText value={row.qrCollection} />
          </Descriptions.Item>
          <Descriptions.Item label="Chênh lệch">
            <MoneyText value={Math.abs(diff)} strong /> · {settlementDirection(diff)}
          </Descriptions.Item>
        </Descriptions>
      )}
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ method: 'TRANSFER', settleDate: dayjs() }}
        onFinish={finish}
      >
        <Form.Item label="Ngày quyết toán" name="settleDate" rules={[{ required: true, message: 'Vui lòng chọn ngày quyết toán' }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
        </Form.Item>
        <Form.Item label="Người đại diện công ty" name="representativeName" extra="Để trống thì lấy người đầu mối của công ty">
          <Input maxLength={100} />
        </Form.Item>
        {diff !== 0 && (
          <Form.Item label="Hình thức" name="method" rules={[{ required: true, message: 'Vui lòng chọn hình thức' }]}>
            <Radio.Group
              optionType="button"
              options={(Object.keys(RECEIPT_METHOD_LABELS) as ReceiptMethod[]).map((m) => ({ value: m, label: RECEIPT_METHOD_LABELS[m] }))}
            />
          </Form.Item>
        )}
        <Form.Item label={diff !== 0 && method === 'TRANSFER' ? 'Số ủy nhiệm chi / mã giao dịch' : 'Số chứng từ'} name="documentRef">
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
