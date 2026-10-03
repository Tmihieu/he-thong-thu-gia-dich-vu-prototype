import { BankOutlined, WalletOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Drawer, Form, Radio, Select, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { api } from '../../../api/client';
import { errorText } from '../../../shared/errorText';
import { formatMoney } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import { type Collector, type CollectorCharge, collectionKeys, type PaymentResult } from '../api';

export type Method = 'CASH' | 'TRANSFER';

/**
 * Góp ý BA 03/10: người đi thu chỉ đánh dấu đã thu và chọn hình thức, thu đủ số còn thiếu. Vắng nhà / hẹn / từ chối /
 * thu một phần chỉ ẩn trên giao diện; API lượt ghé và thu một phần vẫn giữ.
 */
const TILES: { value: Method; label: string; icon: ReactNode }[] = [
  { value: 'CASH', label: 'Đã thu tiền mặt', icon: <WalletOutlined /> },
  { value: 'TRANSFER', label: 'Đã thu chuyển khoản', icon: <BankOutlined /> },
];

interface Values {
  result: Method;
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
  /** Người đi thu bấm thẳng nút "Đã thu tiền mặt / chuyển khoản" trên thẻ hộ: chỉ còn bước xác nhận số tiền. */
  initialMethod?: Method;
}

/** Bottom sheet ghi nhận đã thu một hộ: tiền mặt / chuyển khoản, thu đủ số còn thiếu. */
export function ResultSheet({ item, onClose, collectors, defaultCollectorId, initialMethod }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Values>();
  const submit = useMutation({
    mutationFn: async (v: Values) => {
      const charge = item!.charge;
      const key = `payment:${charge.id}`;
      const r = await api.post<PaymentResult>('/api/collection/payments', {
        chargeId: charge.id,
        amount: item!.remainingAmount,
        method: v.result,
        clientRequestId: requestIdFor(key),
        collectorId: v.collectorId,
      });
      pendingRequestIds.delete(key);
      return `Đã thu ${formatMoney(r.payment.amount)} · ${charge.subjectName}`;
    },
    onSuccess: (text) => {
      message.success(text);
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      // Số công ty đã thu ở sổ công ty–kỳ đổi theo (Tiến độ, Đối soát, màn Công ty).
      void queryClient.invalidateQueries({ queryKey: ['remittance'] });
      onClose();
    },
  });

  useEffect(() => {
    if (item) form.setFieldsValue({ result: initialMethod ?? 'CASH', collectorId: defaultCollectorId });
  }, [item, form, defaultCollectorId, initialMethod]);

  const remaining = item?.remainingAmount ?? 0;
  return (
    <Drawer
      placement="bottom"
      height="auto"
      open={item !== null}
      onClose={onClose}
      title={initialMethod ? TILES.find((t) => t.value === initialMethod)!.label : 'Ghi nhận đã thu'}
      className="clm-sheet"
      destroyOnHidden
      styles={{ body: { paddingBottom: 24 } }}
    >
      {item && (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          {item.charge.subjectName} · {item.charge.subjectAddress} · số tiền thu <MoneyText value={remaining} strong />
        </Typography.Paragraph>
      )}
      {submit.error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 12 }}
          message={errorText(submit.error, 'Không gửi được. Vui lòng thử lại.')}
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
        <Form.Item name="result" label="Kết quả" hidden={initialMethod !== undefined} rules={[{ required: true, message: 'Vui lòng chọn kết quả' }]}>
          <Radio.Group className="clm-tiles">
            {TILES.map((t) => (
              <Radio.Button key={t.value} value={t.value}>
                {t.icon}
                <span>{t.label}</span>
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        {collectors && (
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
        <p className="clm-tip">
          <strong>Đã thu:</strong> hệ thống ghi nhận và sinh mã thanh toán; hộ chưa nộp thì cứ để chưa thu.
        </p>
        <div className="clm-sheet-actions">
          <Button size="large" onClick={onClose}>
            Hủy
          </Button>
          <Button size="large" type="primary" htmlType="submit" loading={submit.isPending}>
            {initialMethod ? `Xác nhận đã thu ${formatMoney(remaining)}` : 'Xác nhận đã thu'}
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
