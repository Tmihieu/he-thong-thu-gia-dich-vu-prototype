import { Alert, Button, Descriptions, Form, InputNumber, Radio, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';

import type { OpenPeriodRequest, TariffVersion } from '../api';
import { periodStart, tariffOn } from '../api';

interface FormValues {
  type: 'MONTH' | 'QUARTER';
  year: number;
  number?: number;
}

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
            virtual={false}
            placeholder="Chọn"
          />
        </Form.Item>
      </Space>
      <Typography.Paragraph type="secondary">
        Cán bộ xã sẽ đặt ngày mở và hạn dân đóng khi mở kỳ. Hạn quyết toán là ngày 5 tháng sau kỳ.
      </Typography.Paragraph>
      <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Biểu giá áp dụng">
          {start ? (tariff ? `${tariff.code} · ${tariff.legalBasis}` : 'Không có biểu giá hiệu lực cho kỳ này') : '—'}
        </Descriptions.Item>
      </Descriptions>
      <Space>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Tạo kỳ dự thảo
        </Button>
        {onCancel && <Button onClick={onCancel}>Hủy</Button>}
      </Space>
    </Form>
  );
}
