import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Form, InputNumber, Popconfirm, Space, Switch, Table, Typography } from 'antd';
import { useState } from 'react';

import { api } from '../../api/client';
import { DateText } from '../../shared/DateText';
import { errorTextOrNull } from '../../shared/errorText';
import { MoneyText } from '../../shared/MoneyText';

interface Rule {
  enabled: boolean;
  daysBeforeDue: number;
  repeatEveryDays: number;
}

interface Target {
  companyId: number;
  companyCode: string;
  companyName: string;
  periodId: number;
  periodLabel: string;
  dueDate: string;
  remaining: number;
  overdue: boolean;
}

const path = '/api/remittance/reminder-rule';
const queryKey = ['remittance', 'reminder-rule'];

export function CompanyReminderRuleCard() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Rule>();
  const [dirty, setDirty] = useState(false);
  const rule = useQuery({ queryKey, queryFn: () => api.get<Rule>(path) });
  const preview = useQuery({
    queryKey: [...queryKey, 'preview'],
    queryFn: () => api.get<Target[]>(`${path}/preview`),
    enabled: !!rule.data,
  });
  const update = useMutation({
    mutationFn: (body: Rule) => api.put<Rule>(path, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved);
      setDirty(false);
      void preview.refetch();
      message.success('Đã lưu cấu hình nhắc công ty nộp tiền');
    },
  });
  const run = useMutation({
    mutationFn: () => api.post<{ sent: number }>(`${path}/run`),
    onSuccess: (result) => {
      message.success(`Đã gửi ${result.sent} thông báo nhắc nộp`);
      void preview.refetch();
    },
  });

  if (rule.error) return <Alert type="error" showIcon message={errorTextOrNull(rule.error)} />;
  if (!rule.data) return <Card loading />;

  const error = update.error ?? run.error ?? preview.error;
  const busy = update.isPending || run.isPending;

  return (
    <Card title="Nhắc công ty nộp tiền tự động" className="section-card">
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="Công ty phải nộp trước phần vận chuyển và xử lý về xã theo khoản đã phát hành, dù chưa thu được tiền từ hộ. Số nhắc là số còn phải nộp sau điều chỉnh và trừ phiếu thu đã lập; không gồm phần thu gom công ty được giữ."
        description="Thông báo gửi tới quản lý công ty trong ứng dụng lúc 08:00 hằng ngày. Nhắc một lần trước hoặc đúng hạn; quá hạn thì nhắc lại theo chu kỳ. Không gửi khi đã nộp đủ, quy tắc tắt hoặc kỳ đã khóa." />
      {error && <Alert type="error" showIcon message={errorTextOrNull(error)} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" initialValues={rule.data} disabled={busy}
        onValuesChange={() => setDirty(true)} onFinish={(values: Rule) => update.mutate(values)}>
        <Form.Item name="enabled" label="Nhắc nộp tự động" valuePropName="checked">
          <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
        </Form.Item>
        <Space wrap align="start" size="large">
          <Form.Item name="daysBeforeDue" label="Nhắc trước hạn nộp" extra="0 = bắt đầu nhắc vào ngày đến hạn."
            rules={[{ required: true, message: 'Nhập số ngày nhắc trước' }]}>
            <InputNumber min={0} max={365} precision={0} addonAfter="ngày" />
          </Form.Item>
          <Form.Item name="repeatEveryDays" label="Nhắc lại khi quá hạn mỗi"
            rules={[{ required: true, message: 'Nhập số ngày nhắc lại' }]}>
            <InputNumber min={1} max={365} precision={0} addonAfter="ngày" />
          </Form.Item>
        </Space>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={update.isPending}>Lưu cấu hình nhắc nộp</Button>
        </Form.Item>
      </Form>
      <Typography.Title level={5}>Dự kiến gửi hôm nay theo cấu hình đã lưu</Typography.Title>
      {dirty && <Alert type="warning" showIcon message="Lưu cấu hình để cập nhật danh sách xem trước và gửi nhắc." style={{ marginBottom: 16 }} />}
      <Space wrap style={{ marginBottom: 16 }}>
        <Button onClick={() => void preview.refetch()} disabled={dirty || busy} loading={preview.isFetching}>Xem trước nhắc nộp</Button>
        <Popconfirm title="Gửi nhắc nộp ngay?" description="Hệ thống kiểm tra lại công nợ và lịch đã gửi trước khi gửi thông báo."
          onConfirm={() => run.mutate()} okText="Gửi nhắc" cancelText="Hủy">
          <Button disabled={dirty || busy || preview.isFetching || !!preview.error || !preview.data?.length}
            loading={run.isPending}>Gửi nhắc ngay</Button>
        </Popconfirm>
      </Space>
      <Table<Target> rowKey={(target) => `${target.companyId}-${target.periodId}`} dataSource={preview.data ?? []}
        loading={preview.isFetching} scroll={{ x: 760 }}
        locale={{ emptyText: rule.data.enabled ? 'Không có công ty đến lịch nhắc còn phải nộp' : 'Nhắc tự động đang tắt' }}
        columns={[
          { title: 'Công ty', className: 'cell-left', render: (_, target) => `${target.companyCode} · ${target.companyName}` },
          { title: 'Kỳ', dataIndex: 'periodLabel' },
          { title: 'Hạn nộp xã', render: (_, target) => <DateText value={target.dueDate} /> },
          { title: 'Còn phải nộp', render: (_, target) => <MoneyText value={target.remaining} /> },
          { title: 'Trạng thái', render: (_, target) => target.overdue ? 'Quá hạn' : 'Trong hạn' },
        ]} />
    </Card>
  );
}
