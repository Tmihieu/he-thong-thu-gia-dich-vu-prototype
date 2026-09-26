import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, DatePicker, Drawer, Form, Input, InputNumber, Radio, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect } from 'react';

import { api, ApiError } from '../../../api/client';
import { formatMoney } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import { type CollectorCharge, collectionKeys, type PaymentResult, type Visit } from '../api';
import { RESULT_LABELS, type ResultKind } from '../workState';

interface Values {
  result: ResultKind;
  amount?: number;
  bankRef?: string;
  revisitDate?: Dayjs;
  note?: string;
}

/**
 * Mã chống gửi trùng theo khoản và loại thao tác: giữ nguyên tới khi gửi thành công (bấm lại khi mạng chậm, hoặc
 * đóng rồi mở lại sau lỗi, vẫn dùng mã cũ để máy chủ trả kết quả cũ); thành công thì lần sau sinh mã mới.
 */
const pendingRequestIds = new Map<string, string>();

function requestIdFor(key: string): string {
  let id = pendingRequestIds.get(key);
  if (!id) {
    id = crypto.randomUUID();
    pendingRequestIds.set(key, id);
  }
  return id;
}

interface Props {
  item: CollectorCharge | null;
  onClose: () => void;
  /** Quản lý công ty ghi thay: người đi thu đã nhận tiền (T28). */
  collectorId?: number;
}

/** Bottom sheet cập nhật kết quả thu một hộ: tiền mặt / chuyển khoản / vắng / hẹn (ngày hẹn) / từ chối. */
export function ResultSheet({ item, onClose, collectorId }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Values>();
  const result = Form.useWatch('result', form);
  const paying = result === 'CASH' || result === 'TRANSFER';

  const submit = useMutation({
    mutationFn: async (v: Values) => {
      const charge = item!.charge;
      if (v.result === 'CASH' || v.result === 'TRANSFER') {
        const key = `payment:${charge.id}`;
        const r = await api.post<PaymentResult>('/api/collection/payments', {
          chargeId: charge.id,
          amount: v.amount,
          method: v.result,
          clientRequestId: requestIdFor(key),
          bankRef: v.result === 'TRANSFER' ? v.bankRef?.trim() || undefined : undefined,
          note: v.note?.trim() || undefined,
          collectorId,
        });
        pendingRequestIds.delete(key);
        return `Đã thu ${formatMoney(r.payment.amount)} · ${charge.subjectName}`;
      }
      const key = `visit:${charge.id}`;
      await api.post<Visit>('/api/collection/visits', {
        chargeId: charge.id,
        result: v.result,
        revisitDate: v.revisitDate?.format('YYYY-MM-DD'),
        note: v.note?.trim() || undefined,
        clientRequestId: requestIdFor(key),
      });
      pendingRequestIds.delete(key);
      return `Đã ghi ${RESULT_LABELS[v.result].toLowerCase()} · ${charge.subjectName}`;
    },
    onSuccess: (text) => {
      message.success(text);
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      onClose();
    },
  });

  useEffect(() => {
    if (item) form.setFieldsValue({ result: 'CASH', amount: item.remainingAmount });
  }, [item, form]);

  const remaining = item?.remainingAmount ?? 0;
  return (
    <Drawer
      placement="bottom"
      height="auto"
      open={item !== null}
      onClose={onClose}
      title={item ? `${item.charge.subjectName} · ${item.charge.subjectCode}` : 'Cập nhật kết quả'}
      destroyOnHidden
      styles={{ body: { paddingBottom: 24 } }}
    >
      {item && (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          {item.charge.subjectAddress} · còn thiếu <MoneyText value={remaining} strong />
        </Typography.Paragraph>
      )}
      {submit.error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 12 }}
          message={submit.error instanceof ApiError ? submit.error.message : 'Không gửi được. Vui lòng thử lại.'}
        />
      )}
      <Form<Values>
        form={form}
        layout="vertical"
        onFinish={(v) => {
          if (!submit.isPending) submit.mutate(v);
        }}
        preserve={false}
      >
        <Form.Item name="result" label="Kết quả" rules={[{ required: true, message: 'Vui lòng chọn kết quả' }]}>
          <Radio.Group buttonStyle="solid" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(RESULT_LABELS) as ResultKind[]).map((k) => (
              <Radio.Button key={k} value={k}>
                {RESULT_LABELS[k]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        {paying && (
          <Form.Item
            name="amount"
            label="Số tiền thu"
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền' },
              { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' },
              { type: 'number', max: remaining, message: `Không vượt số còn thiếu (${formatMoney(remaining)})` },
            ]}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              inputMode="numeric"
              addonAfter="đ"
              formatter={(v) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
              parser={(v) => Number((v ?? '').replace(/\D/g, ''))}
            />
          </Form.Item>
        )}
        {result === 'TRANSFER' && (
          <Form.Item name="bankRef" label="Mã giao dịch ngân hàng">
            <Input maxLength={50} />
          </Form.Item>
        )}
        {(result === 'APPOINTMENT' || result === 'ABSENT') && (
          <Form.Item
            name="revisitDate"
            label={result === 'APPOINTMENT' ? 'Ngày hẹn' : 'Ngày quay lại'}
            rules={result === 'APPOINTMENT' ? [{ required: true, message: 'Vui lòng chọn ngày hẹn' }] : []}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              inputReadOnly={false}
              disabledDate={(d) => d.isBefore(dayjs(), 'day')}
            />
          </Form.Item>
        )}
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={submit.isPending}>
            Xác nhận
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
}
