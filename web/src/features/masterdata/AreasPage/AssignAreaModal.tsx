import { Alert, DatePicker, Form, Input, Modal, Select } from 'antd';
import type { Dayjs } from 'dayjs';

import type { Area, AssignRequest, Company } from '../api';

interface FormValues {
  areaIds: number[];
  companyId?: number;
  fromDate?: Dayjs | null;
  note?: string;
  decisionNo?: string;
}

interface Props {
  open: boolean;
  areas: Area[];
  companies: Company[];
  initialAreaIds: number[];
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: AssignRequest) => void;
  onCancel: () => void;
}

/** Popup phân công một hoặc nhiều tổ cho một công ty (§10 bước 2). Phân công cũ backend tự đóng. */
export function AssignAreaModal({ open, areas, companies, initialAreaIds, submitting, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();

  function finish(values: FormValues) {
    onSubmit({
      areaIds: values.areaIds,
      companyId: values.companyId!,
      fromDate: values.fromDate!.format('YYYY-MM-DD'),
      note: values.note?.trim() || undefined,
      decisionNo: values.decisionNo?.trim() || undefined,
    });
  }

  return (
    <Modal
      title="Phân công khu vực"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Phân công"
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        initialValues={{ areaIds: initialAreaIds }}
        onFinish={finish}
      >
        {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
        <Form.Item label="Tổ dân phố" name="areaIds" rules={[{ required: true, message: 'Vui lòng chọn ít nhất một tổ' }]}>
          <Select
            mode="multiple"
            aria-label="Tổ dân phố"
            placeholder="Chọn tổ"
            optionFilterProp="label"
            options={areas.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
          />
        </Form.Item>
        <Form.Item label="Công ty phụ trách" name="companyId" rules={[{ required: true, message: 'Vui lòng chọn công ty' }]}>
          <Select
            aria-label="Công ty phụ trách"
            placeholder="Chọn công ty"
            showSearch
            optionFilterProp="label"
            options={companies.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
          />
        </Form.Item>
        <Form.Item
          label="Từ ngày"
          name="fromDate"
          rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
          extra="Phân công đang có của tổ sẽ kết thúc vào ngày trước đó và được giữ trong lịch sử."
        >
          <DatePicker format="DD/MM/YYYY" placeholder="dd/mm/yyyy" />
        </Form.Item>
        <Form.Item label="Số văn bản phân công" name="decisionNo">
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
