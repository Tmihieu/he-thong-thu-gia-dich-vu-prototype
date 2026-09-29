import { BankOutlined, CalendarOutlined, HomeOutlined, StopOutlined, WalletOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, DatePicker, Drawer, Form, Input, InputNumber, Radio, Select, Typography } from 'antd';
import type { ReactNode } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect } from 'react';

import { api, ApiError } from '../../../api/client';
import { formatMoney } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import { type Collector, type CollectorCharge, collectionKeys, type PaymentResult, type Visit } from '../api';
import { RESULT_LABELS, type ResultKind } from '../workState';

/** Ô chọn kết quả như prototype (clm-result-grid). */
const TILES: { value: ResultKind; label: string; icon: ReactNode }[] = [
  { value: 'CASH', label: 'Đã thu tiền mặt', icon: <WalletOutlined /> },
  { value: 'TRANSFER', label: 'Đã thu chuyển khoản', icon: <BankOutlined /> },
  { value: 'ABSENT', label: 'Vắng nhà', icon: <HomeOutlined /> },
  { value: 'APPOINTMENT', label: 'Đã hẹn', icon: <CalendarOutlined /> },
  { value: 'REFUSED', label: 'Từ chối nộp', icon: <StopOutlined /> },
];

function tip(result: ResultKind | undefined) {
  if (result === 'CASH' || result === 'TRANSFER')
    return (
      <>
        <strong>Đã thu:</strong> hệ thống xuất biên lai điện tử và gửi cho hộ ngay, không nhập số biên lai.
      </>
    );
  if (result === 'REFUSED')
    return (
      <>
        <strong>Từ chối nộp:</strong> ghi rõ lý do; công ty và xã sẽ thấy để xử lý.
      </>
    );
  return (
    <>
      <strong>Chưa thu:</strong> hộ giữ trạng thái chưa thu, ghi ngày quay lại để nhắc lịch.
    </>
  );
}

interface Values {
  result: ResultKind;
  amount?: number;
  bankRef?: string;
  revisitDate?: Dayjs;
  note?: string;
  collectorId?: number;
}

/**
 * Mã chống gửi trùng theo khoản và loại thao tác: giữ nguyên tới khi gửi thành công (bấm lại khi mạng chậm, hoặc
 * đóng rồi mở lại sau lỗi, vẫn dùng mã cũ để máy chủ trả kết quả cũ); thành công thì lần sau sinh mã mới.
 */
const pendingRequestIds = new Map<string, string>();

function requestIdFor(key: string): string {
  let id = pendingRequestIds.get(key);
  if (!id) {
    // Không dùng crypto.randomUUID: nó chỉ có trong secure context, điện thoại mở web qua http://<IP LAN> thì không có.
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    pendingRequestIds.set(key, id);
  }
  return id;
}

interface Props {
  item: CollectorCharge | null;
  onClose: () => void;
  /** Quản lý công ty ghi thay (T28): chọn người đi thu đã nhận tiền, mặc định người phụ trách tổ. */
  collectors?: Collector[];
  defaultCollectorId?: number;
}

/** Bottom sheet cập nhật kết quả thu một hộ: tiền mặt / chuyển khoản / vắng / hẹn (ngày hẹn) / từ chối. */
export function ResultSheet({ item, onClose, collectors, defaultCollectorId }: Props) {
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
          collectorId: v.collectorId,
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
    if (item) form.setFieldsValue({ result: 'CASH', amount: item.remainingAmount, collectorId: defaultCollectorId });
  }, [item, form, defaultCollectorId]);

  const remaining = item?.remainingAmount ?? 0;
  return (
    <Drawer
      placement="bottom"
      height="auto"
      open={item !== null}
      onClose={onClose}
      title="Cập nhật kết quả"
      className="clm-sheet"
      destroyOnHidden
      styles={{ body: { paddingBottom: 24 } }}
    >
      {item && (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          {item.charge.subjectName} · {item.charge.subjectAddress} · còn thiếu <MoneyText value={remaining} strong />
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
          <Radio.Group className="clm-tiles">
            {TILES.map((t) => (
              <Radio.Button key={t.value} value={t.value}>
                {t.icon}
                <span>{t.label}</span>
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        {paying && (
          <Form.Item
            name="amount"
            label="Số tiền thực thu"
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
        {paying && collectors && (
          <Form.Item
            name="collectorId"
            label="Người đi thu đã nhận tiền"
            rules={[{ required: true, message: 'Vui lòng chọn người đi thu' }]}
          >
            <Select
              placeholder="Chọn người đi thu"
              options={collectors.map((c) => ({ value: c.id, label: `${c.fullName} · ${c.username}` }))}
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
          <Input.TextArea rows={2} maxLength={500} placeholder="Ví dụ: hẹn sau 18:00, để giấy báo..." />
        </Form.Item>
        <p className="clm-tip">{tip(result)}</p>
        <div className="clm-sheet-actions">
          <Button size="large" onClick={onClose}>
            Hủy
          </Button>
          <Button size="large" type="primary" htmlType="submit" loading={submit.isPending}>
            Lưu kết quả
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
