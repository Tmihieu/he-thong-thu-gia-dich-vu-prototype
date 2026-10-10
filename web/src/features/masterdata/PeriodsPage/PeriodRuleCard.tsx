import { Alert, App, Button, Card, Form, InputNumber, Radio, Space, Switch, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { type PeriodRule, useDraftPeriods, usePeriodRule, useRunPeriodRule, useUpdatePeriodRule } from '../api';

type FormValues = Pick<PeriodRule, 'enabled' | 'periodType' | 'createDay' | 'remitDueDays'>;

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

/**
 * Quy tắc tự tạo kỳ thu (quản trị, 04/10): hệ thống tự tạo kỳ kế tiếp ở dạng dự thảo, cán bộ xã xem trước rồi mở kỳ.
 * Quản trị chỉ đặt quy tắc, không duyệt từng kỳ.
 */
export function PeriodRuleCard() {
  const { message } = App.useApp();
  const rule = usePeriodRule();
  const drafts = useDraftPeriods();
  const update = useUpdatePeriodRule();
  const run = useRunPeriodRule();
  const [form] = Form.useForm<FormValues>();
  const [dirty, setDirty] = useState(false);
  const periodType = Form.useWatch('periodType', form) ?? rule.data?.periodType;
  const createDay = Form.useWatch('createDay', form) ?? rule.data?.createDay;

  if (rule.error) {
    return <Alert type="error" showIcon message={errorMessage(rule.error)} style={{ marginBottom: 16 }} />;
  }
  if (!rule.data) return <Card loading style={{ marginBottom: 16 }} />;

  const unit = periodType === 'QUARTER' ? 'quý' : 'tháng';
  const when =
    periodType === 'QUARTER'
      ? `từ ngày ${createDay} của tháng cuối mỗi quý`
      : `từ ngày ${createDay} hằng tháng`;

  return (
    <Card
      size="small"
      title="Tự tạo kỳ thu"
      style={{ marginBottom: 16 }}
      extra={drafts.data && drafts.data.length > 0 ? <Typography.Text type="secondary">Đang chờ mở: {drafts.data.map((d) => d.label).join(', ')}</Typography.Text> : null}
    >
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="Hệ thống kiểm tra lúc 07:30 hằng ngày và tạo kỳ dự thảo theo lịch. Quản trị xem trước các khoản, kiểm tra hạn nộp rồi xác nhận mở kỳ & phát hành; chưa xác nhận thì chưa có khoản thu." />
      <Form<FormValues>
        key={rule.data.updatedAt}
        form={form}
        layout="vertical"
        requiredMark={false}
        disabled={update.isPending}
        initialValues={{
          enabled: rule.data.enabled,
          periodType: rule.data.periodType,
          createDay: rule.data.createDay,
          remitDueDays: rule.data.remitDueDays,
        }}
        onValuesChange={() => setDirty(true)}
        onFinish={(values) =>
          update.mutate(values, {
            onSuccess: () => {
              setDirty(false);
              message.success('Đã lưu quy tắc tự tạo kỳ');
            },
          })
        }
      >
        {errorMessage(update.error) && (
          <Alert type="error" showIcon message={errorMessage(update.error)} role="alert" style={{ marginBottom: 16 }} />
        )}
        <Form.Item label="Tự tạo kỳ" name="enabled" valuePropName="checked" extra="Tắt thì quản trị tạo kỳ dự thảo thủ công.">
          <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
        </Form.Item>
        <Space size="large" wrap align="start">
          <Form.Item label="Chu kỳ" name="periodType">
            <Radio.Group
              optionType="button"
              options={[
                { value: 'MONTH', label: 'Tháng' },
                { value: 'QUARTER', label: 'Quý' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Ngày tạo kỳ (hằng tháng)"
            name="createDay"
            rules={[{ required: true, message: 'Vui lòng nhập ngày từ 1 đến 28' }]}
            extra={`Tạo kỳ ${unit} kế tiếp ${when}.`}
          >
            <InputNumber min={1} max={28} precision={0} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item
            label="Hạn công ty nộp xã"
            name="remitDueDays"
            rules={[{ required: true, message: 'Vui lòng nhập số ngày' }]}
            extra="= ngày cuối kỳ + số ngày này."
          >
            <InputNumber min={0} max={365} precision={0} style={{ width: 130 }} addonAfter="ngày" />
          </Form.Item>
        </Space>
        <Space>
          <Button type="primary" htmlType="submit" loading={update.isPending}>
            Lưu quy tắc
          </Button>
          <Button
            loading={run.isPending}
            disabled={update.isPending || dirty}
            onClick={() => run.mutate(undefined, { onSuccess: (r) => (r.created ? message.success(r.message) : message.info(r.message)) })}
            title={dirty ? 'Lưu quy tắc trước khi chạy thử' : undefined}
          >
            Chạy thử ngay
          </Button>
        </Space>
        {errorMessage(run.error) && (
          <Alert type="error" showIcon message={errorMessage(run.error)} role="alert" style={{ marginTop: 16 }} />
        )}
      </Form>
    </Card>
  );
}
