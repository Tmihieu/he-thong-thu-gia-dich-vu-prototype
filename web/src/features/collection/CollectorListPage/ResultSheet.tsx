import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircleFilled } from '@ant-design/icons';
import { Alert, App, Button, Drawer, Form, Select, Spin, Typography } from 'antd';
import { useEffect } from 'react';

import { api, ApiError } from '../../../api/client';
import { DEMO_LOGIN_ENABLED } from '../../../app/auth/demoAccounts';
import { errorText } from '../../../shared/errorText';
import { formatDate, formatMoney } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import type { components } from '../../../api/schema';
import { type Collector, type CollectorCharge, collectionKeys, type PaymentResult } from '../api';

type TransferInfo = components['schemas']['TransferInfoDto'];

/** Ảnh VietQR của SePay: quét bằng app ngân hàng bất kỳ là có sẵn tài khoản, số tiền và nội dung. */
const qrImage = (t: TransferInfo) =>
  `https://qr.sepay.vn/img?${new URLSearchParams({ acc: t.bankAccount, bank: t.bankName, amount: String(t.amount), des: t.code })}`;

/** Hộ chỉ đóng tiền mặt cho người đi thu, hoặc chuyển khoản qua mã VietQR của xã (ngân hàng báo về tự ghi nhận). */
export type Method = 'CASH' | 'TRANSFER';

interface Values {
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
  /** Quản lý công ty ghi thay (T28): chọn người đi thu đã nhận tiền. */
  collectors?: Collector[];
  defaultCollectorId?: number;
  /** Người đi thu bấm thẳng nút trên thẻ hộ: tiền mặt thì xác nhận số tiền, chuyển khoản thì hiện mã VietQR. */
  initialMethod?: Method;
}

/**
 * Bottom sheet thu một hộ, đúng số cần đóng. Tiền mặt: người đi thu (hoặc quản lý ghi thay) xác nhận đã nhận tiền.
 * Chuyển khoản (góp ý 04/10): chỉ hiện mã VietQR của tài khoản của xã, đúng số tiền và mã khoản trong nội dung; hộ
 * chuyển bằng app ngân hàng, SePay báo về backend (webhook) ghi nhận, màn này tự hỏi lại máy chủ và tự đóng khi khoản
 * đã thu. Không ai tự bấm "đã chuyển khoản" và không có thanh toán mô phỏng.
 */
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
        method: 'CASH',
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

  const qr = initialMethod === 'TRANSFER';
  const chargeId = item?.charge.id;
  const watch = useQuery({
    queryKey: [...collectionKeys.myWork, 'qr', chargeId],
    queryFn: () => api.get<CollectorCharge[]>('/api/collection/my-work', { params: { periodId: item!.charge.periodId } }),
    enabled: qr && item !== null,
    refetchInterval: 3000,
    // Người đi thu đưa máy cho hộ xem hoặc chuyển sang app khác: vẫn hỏi lại máy chủ, nếu không màn QR không tự đóng.
    refetchIntervalInBackground: true,
  });
  const transfer = useQuery({
    queryKey: [...collectionKeys.all, 'transfer-info', chargeId],
    queryFn: () => api.get<TransferInfo>(`/api/collection/charges/${chargeId}/transfer-info`),
    enabled: qr && item !== null,
  });
  const watched = watch.data?.find((w) => w.charge.id === chargeId);
  const paidByHousehold = qr && watched?.charge.status === 'PAID';
  useEffect(() => {
    if (!paidByHousehold) return;
    void queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['remittance'] });
  }, [paidByHousehold, queryClient]);
  // Chỉ chạy được ở backend profile demo (ngoài demo máy chủ trả 404); nút cũng chỉ hiện khi bật đăng nhập demo.
  const simulate = useMutation({
    mutationFn: () => api.post<void>(`/api/collection/charges/${chargeId}/simulate-transfer`),
    onSuccess: () => watch.refetch(),
  });

  const remaining = item?.remainingAmount ?? 0;
  return (
    <Drawer
      placement="bottom"
      height="auto"
      open={item !== null}
      onClose={onClose}
      title={paidByHousehold ? 'Kết quả giao dịch' : qr ? 'Quét mã để chuyển khoản' : 'Đã thu tiền mặt'}
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
        // Ngăn kéo hủy nội dung khi đóng nên form dựng lại mỗi lần mở: đặt giá trị đầu ở đây. Đặt bằng setFieldsValue trong
        // effect thì trên máy tắt hiệu ứng động form chưa dựng xong, ô ẩn "result" rỗng và bấm xác nhận không gửi được.
        initialValues={{ collectorId: defaultCollectorId }}
        onFinish={(v) => {
          if (!submit.isPending) submit.mutate(v);
        }}
        preserve={false}
      >
        {collectors && !qr && (
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
        {paidByHousehold && item ? (
          <div role="status" style={{ textAlign: 'center' }}>
            <CheckCircleFilled style={{ fontSize: 56, color: '#16a34a' }} />
            <Typography.Title level={4} style={{ margin: '8px 0 0' }}>
              Giao dịch thành công
            </Typography.Title>
            <Typography.Title level={2} style={{ margin: '4px 0' }}>
              {formatMoney(item.charge.amount)}
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              {item.charge.subjectName} · mã khoản {item.charge.code}
              <br />
              Chuyển khoản · {formatDate(watched?.lastPaidAt, true)}
            </Typography.Paragraph>
            <div className="clm-sheet-actions">
              <Button size="large" type="primary" onClick={onClose}>
                Hoàn tất
              </Button>
            </div>
          </div>
        ) : qr && item ? (
          <>
            {transfer.isLoading && <Spin style={{ display: 'block', margin: '24px auto' }} />}
            {transfer.error &&
              (transfer.error instanceof ApiError && transfer.error.code === 'COMMUNE_BANK_ACCOUNT_MISSING' ? (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Xã chưa khai tài khoản nhận chuyển khoản"
                  description="Báo quản trị viên khai tài khoản của xã thì mới hiện được mã QR. Hộ vẫn đóng được bằng tiền mặt."
                />
              ) : (
                <Alert type="error" showIcon style={{ marginBottom: 12 }} message={errorText(transfer.error, 'Không tải được thông tin chuyển khoản.')} />
              ))}
            {transfer.data && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                  <img src={qrImage(transfer.data)} alt="Mã QR chuyển khoản" width={240} height={240} style={{ objectFit: 'contain' }} />
                  <Typography.Text strong style={{ fontSize: 20 }}>
                    {formatMoney(transfer.data.amount)}
                  </Typography.Text>
                  <Typography.Text>
                    {transfer.data.bankName} · {transfer.data.bankAccount}
                  </Typography.Text>
                  <Typography.Text type="secondary">{transfer.data.accountHolder}</Typography.Text>
                  <Typography.Text type="secondary">Nội dung: {transfer.data.code}</Typography.Text>
                </div>
                <p className="clm-tip" role="status">
                  <strong>Đang chờ hộ chuyển khoản…</strong> Hộ quét mã bằng app ngân hàng, giữ nguyên số tiền và nội dung; ngân hàng báo
                  về là hệ thống tự xác nhận, không cần bấm gì thêm.
                </p>
              </>
            )}
            <div className="clm-sheet-actions">
              {DEMO_LOGIN_ENABLED && transfer.data && (
                <Button size="large" loading={simulate.isPending} onClick={() => simulate.mutate()}>
                  Mô phỏng chuyển khoản
                </Button>
              )}
              <Button size="large" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="clm-tip">
              <strong>Đã thu tiền mặt:</strong> hệ thống ghi nhận và sinh mã thanh toán; hộ chuyển khoản thì dùng mã VietQR,
              ngân hàng báo về là tự ghi nhận.
            </p>
            <div className="clm-sheet-actions">
              <Button size="large" onClick={onClose}>
                Hủy
              </Button>
              <Button size="large" type="primary" htmlType="submit" loading={submit.isPending}>
                {initialMethod ? `Xác nhận đã thu ${formatMoney(remaining)}` : 'Xác nhận đã thu'}
              </Button>
            </div>
          </>
        )}
      </Form>
    </Drawer>
  );
}
