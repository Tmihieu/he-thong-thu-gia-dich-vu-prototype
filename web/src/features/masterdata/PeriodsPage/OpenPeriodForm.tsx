import { Alert, Button, DatePicker, Descriptions, Form, Input, InputNumber, Radio, Select, Space } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import type { OpenPeriodRequest, TariffVersion } from '../api';
import { periodStart, tariffOn } from '../api';

interface FormValues {
  type: 'MONTH' | 'QUARTER';
  year: number;
  number?: number;
  openDate?: Dayjs | null;
  dueDate?: Dayjs | null;
  note?: string;
}

const DATE_FORMAT = 'DD/MM/YYYY';
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));
const QUARTERS = Array.from({ length: 4 }, (_, i) => ({ value: i + 1, label: `Quý ${i + 1}` }));

interface Props {
  tariffs: TariffVersion[];
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: OpenPeriodRequest) => void;
  onCancel?: () => void;
}

export function OpenPeriodForm({ tariffs, submitting = false, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const type = Form.useWatch('type', form) ?? 'MONTH';
  const year = Form.useWatch('year', form);
  const number = Form.useWatch('number', form);
  const start = periodStart(type, year, number);
  const tariff = start ? tariffOn(tariffs, start.format('YYYY-MM-DD')) : undefined;

  function finish(values: FormValues) {
    onSubmit({
      type: values.type,
      year: values.year,
      number: values.number!,
      openDate: values.openDate ? values.openDate.format('YYYY-MM-DD') : undefined,
      dueDate: values.dueDate!.format('YYYY-MM-DD'),
      note: values.note?.trim() || undefined,
    });
  }

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      disabled={submitting}
      initialValues={{ type: 'MONTH', year: dayjs().year() }}
      onFinish={finish}
      onValuesChange={(changed) => {
        if ('type' in changed) form.setFieldValue('number', undefined);
      }}
    >
      {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
      <Form.Item label="Loại kỳ" name="type">
        <Radio.Group
          optionType="button"
          options={[
            { value: 'MONTH', label: 'Tháng' },
            { value: 'QUARTER', label: 'Quý' },
          ]}
        />
      </Form.Item>
      <Space size="middle" wrap>
        <Form.Item label="Năm" name="year" rules={[{ required: true, message: 'Vui lòng nhập năm' }]}>
          <InputNumber min={2020} max={2100} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item
          label={type === 'MONTH' ? 'Tháng' : 'Quý'}
          name="number"
          rules={[{ required: true, message: type === 'MONTH' ? 'Vui lòng chọn tháng' : 'Vui lòng chọn quý' }]}
        >
          <Select
            aria-label={type === 'MONTH' ? 'Tháng' : 'Quý'}
            options={type === 'MONTH' ? MONTHS : QUARTERS}
            style={{ width: 160 }}
            placeholder="Chọn"
          />
        </Form.Item>
      </Space>
      <Space size="middle" wrap>
        <Form.Item label="Ngày mở" name="openDate" extra="Để trống thì lấy ngày đầu kỳ">
          <DatePicker format={DATE_FORMAT} placeholder="dd/mm/yyyy" />
        </Form.Item>
        <Form.Item
          label="Hạn công ty nộp xã"
          name="dueDate"
          dependencies={['openDate', 'type', 'year', 'number']}
          rules={[
            { required: true, message: 'Vui lòng chọn hạn nộp' },
            ({ getFieldValue }) => ({
              validator(_, value: Dayjs | null | undefined) {
                const open: Dayjs | undefined =
                  getFieldValue('openDate') ?? periodStart(getFieldValue('type'), getFieldValue('year'), getFieldValue('number'));
                if (!value || !open || !value.isBefore(open, 'day')) return Promise.resolve();
                return Promise.reject(new Error('Hạn nộp không được trước ngày mở kỳ'));
              },
            }),
          ]}
        >
          <DatePicker format={DATE_FORMAT} placeholder="dd/mm/yyyy" />
        </Form.Item>
      </Space>
      <Form.Item label="Ghi chú" name="note">
        <Input.TextArea rows={2} maxLength={2000} />
      </Form.Item>
      <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Biểu giá áp dụng">
          {start ? (tariff ? `${tariff.code} · ${tariff.legalBasis}` : 'Không có biểu giá hiệu lực cho kỳ này') : '—'}
        </Descriptions.Item>
      </Descriptions>
      <Space>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Mở kỳ
        </Button>
        {onCancel && <Button onClick={onCancel}>Hủy</Button>}
      </Space>
    </Form>
  );
}
