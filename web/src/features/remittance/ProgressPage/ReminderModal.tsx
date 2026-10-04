import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, App, DatePicker, Form, Input, Modal, Select, Table } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';

import { api } from '../../../api/client';
import { errorText } from '../../../shared/errorText';
import { LoadingBlock } from '../../../shared/StateBlock';
import type { components } from '../../../api/schema';
import { DateText } from '../../../shared/DateText';
import { MoneyText } from '../../../shared/MoneyText';

type Draft = components['schemas']['DraftDto'];
type Debt = components['schemas']['DebtDto'];
type Reminder = components['schemas']['ReminderDto'];

interface Props {
  open: boolean;
  /** Các công ty quá hạn nộp của kỳ đang xem. */
  companies: { id: number; name: string }[];
  onClose: () => void;
}

/**
 * Popup nhắc nộp (R16): chọn công ty quá hạn, xem trước các kỳ còn nợ và số tiền, sửa nội dung và hạn nộp mới rồi gửi.
 * Chỉ một công ty quá hạn thì chọn sẵn công ty đó.
 */
export function ReminderModal({ open, companies, onClose }: Props) {
  const { message } = App.useApp();
  const [picked, setPicked] = useState<number | null>(null);
  const companyId = open ? (picked ?? (companies.length === 1 ? companies[0]!.id : null)) : null;
  const close = () => {
    setPicked(null);
    onClose();
  };
  const [form] = Form.useForm<{ dueDate: Dayjs; content: string }>();
  const draft = useQuery({
    queryKey: ['remittance', 'reminder-draft', companyId],
    queryFn: () => api.get<Draft>('/api/remittance/reminders/draft', { params: { companyId: companyId! } }),
    enabled: companyId !== null,
  });
  const send = useMutation({
    mutationFn: (v: { dueDate: Dayjs; content: string }) =>
      api.post<Reminder>('/api/remittance/reminders', {
        companyId,
        dueDate: v.dueDate.format('YYYY-MM-DD'),
        content: v.content,
      }),
    onSuccess: (r) => {
      message.success(`Đã gửi nhắc nộp ${r.code} tới ${r.companyCode}`);
      close();
    },
  });

  useEffect(() => {
    if (draft.data) form.setFieldsValue({ dueDate: dayjs(draft.data.dueDate), content: draft.data.content });
  }, [draft.data, form]);

  const error = send.error ?? draft.error;
  return (
    <Modal
      title="Nhắc công ty nộp tiền về xã"
      open={open}
      onCancel={close}
      onOk={() => form.submit()}
      okText="Gửi nhắc nộp"
      cancelText="Hủy"
      okButtonProps={{ disabled: !draft.data || draft.data.debts.length === 0 }}
      confirmLoading={send.isPending}
      width={640}
      destroyOnHidden
    >
      {error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 12 }}
          message={errorText(error)}
        />
      )}
      <Form layout="vertical">
        <Form.Item label="Công ty cần nhắc" required style={{ marginBottom: 16 }}>
          <Select
            aria-label="Công ty cần nhắc"
            placeholder="Chọn công ty quá hạn nộp"
            value={companyId}
            onChange={setPicked}
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
      </Form>
      {draft.isLoading && <LoadingBlock rows={3} />}
      {draft.data && (
        <>
          <Table<Debt>
            size="small"
            rowKey="periodId"
            pagination={false}
            dataSource={draft.data.debts}
            locale={{ emptyText: 'Công ty không có kỳ nào quá hạn còn nợ' }}
            columns={[
              { title: 'Kỳ', dataIndex: 'periodLabel' },
              { title: 'Hạn nộp', dataIndex: 'periodDueDate', render: (d: string) => <DateText value={d} /> },
              { title: 'Còn nợ', dataIndex: 'remaining', align: 'right', render: (v: number) => <MoneyText value={v} /> },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  Tổng cộng
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <MoneyText value={draft.data.amount} strong />
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
          <Form form={form} layout="vertical" style={{ marginTop: 16 }} onFinish={(v) => send.mutate(v)}>
            <Form.Item label="Hạn nộp mới" name="dueDate" rules={[{ required: true, message: 'Vui lòng chọn hạn nộp' }]}>
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item label="Nội dung" name="content" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập nội dung' }]}>
              <Input.TextArea rows={7} maxLength={2000} showCount />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}
