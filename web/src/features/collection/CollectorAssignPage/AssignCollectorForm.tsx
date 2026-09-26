import { Alert, DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import type { AssignCollectorRequest, Collector } from '../api';

interface FormValues {
  collectorId?: number;
  areaIds: number[];
  fromDate?: Dayjs | null;
  note?: string;
}

export interface AreaOption {
  id: number;
  code: string;
  name: string;
}

interface Props {
  open: boolean;
  areas: AreaOption[];
  collectors: Collector[];
  initialAreaIds: number[];
  initialCollectorId?: number;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: AssignCollectorRequest) => void;
  onCancel: () => void;
}

/** Popup gán / đổi người đi thu cho một hoặc nhiều tổ của công ty. Người cũ của tổ backend tự kết thúc. */
export function AssignCollectorForm({
  open, areas, collectors, initialAreaIds, initialCollectorId, submitting, error, onSubmit, onCancel,
}: Props) {
  const [form] = Form.useForm<FormValues>();

  function finish(values: FormValues) {
    onSubmit({
      collectorId: values.collectorId!,
      areaIds: values.areaIds,
      fromDate: values.fromDate!.format('YYYY-MM-DD'),
      note: values.note?.trim() || undefined,
    });
  }

  return (
    <Modal
      title="Phân tổ cho người đi thu"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Phân tổ"
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={error} />}
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ areaIds: initialAreaIds, collectorId: initialCollectorId, fromDate: dayjs() }}
        onFinish={finish}
      >
        <Form.Item label="Tổ" name="areaIds" rules={[{ required: true, message: 'Vui lòng chọn ít nhất một tổ' }]}>
          <Select
            mode="multiple"
            placeholder="Chọn tổ"
            optionFilterProp="label"
            options={areas.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
          />
        </Form.Item>
        <Form.Item label="Người đi thu" name="collectorId" rules={[{ required: true, message: 'Vui lòng chọn người đi thu' }]}>
          <Select
            placeholder="Chọn người đi thu"
            showSearch
            optionFilterProp="label"
            options={collectors
              .filter((c) => c.active)
              .map((c) => ({ value: c.id, label: `${c.fullName} · ${c.username}` }))}
          />
        </Form.Item>
        <Form.Item label="Từ ngày" name="fromDate" rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
