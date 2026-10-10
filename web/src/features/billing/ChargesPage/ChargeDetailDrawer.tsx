import { Alert, App, Button, Descriptions, Drawer, Form, Input, InputNumber, Modal, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { useAuth } from '../../../app/auth/authContext';
import { DateText } from '../../../shared/DateText';
import { errorTextOrNull } from '../../../shared/errorText';
import { formatMoney } from '../../../shared/format';
import { PAYMENT_METHOD_LABELS, TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { ErrorBlock, LoadingBlock } from '../../../shared/StateBlock';
import { type Charge, type ChargeDetail, useChargeDetail, useCorrectCharge } from '../api';
import { ChargeStatusTag } from './ChargesPage';

type Mode = 'adjust' | 'cancel' | null;
type TariffGroup = NonNullable<Charge['tariffGroup']>;

interface FormValues {
  tariffGroup?: TariffGroup;
  memberCount?: number;
  quotaKg?: number;
  reason?: string;
}

const PER_KG: TariffGroup[] = ['BY_VOLUME', 'FULL_COST_BY_KG'];

/** Phần số lượng sau tên nhóm: nhân khẩu (theo nhân khẩu), kg/tháng (theo ký), nhóm khác không có. */
function quantityLabel(group: TariffGroup | null | undefined, qty: number | null | undefined) {
  if (qty == null || !group) return '';
  if (group === 'HH_PER_CAPITA') return ` · ${qty} người`;
  if (PER_KG.includes(group)) return ` · ${qty.toLocaleString('vi-VN')} kg/tháng`;
  return '';
}

/** Chi tiết một khoản phải thu; cán bộ xã điều chỉnh theo biểu giá của kỳ hoặc hủy khoản lập sai phí, bắt buộc ghi lý do. */
export function ChargeDetailDrawer({ chargeId, onClose }: { chargeId: number | null; onClose: () => void }) {
  const detail = useChargeDetail(chargeId);
  const { user } = useAuth();
  const canCorrect = user?.role === 'COMMUNE_OFFICER' || user?.role === 'ADMIN';
  const [mode, setMode] = useState<Mode>(null);
  const d = detail.data;

  return (
    <Drawer
      title={d ? <Space>Khoản {d.charge.code}<ChargeStatusTag charge={d.charge} /></Space> : 'Chi tiết khoản thu'}
      open={chargeId !== null}
      onClose={onClose}
      width={720}
      destroyOnHidden
      extra={
        d && canCorrect && d.correctable && (
          <Space>
            {d.adjustable && <Button onClick={() => setMode('adjust')}>Điều chỉnh theo biểu giá</Button>}
            <Button danger onClick={() => setMode('cancel')}>Hủy khoản</Button>
          </Space>
        )
      }
    >
      {detail.isLoading && <LoadingBlock />}
      {detail.error && <ErrorBlock error={detail.error} onRetry={() => void detail.refetch()} />}
      {d && <DetailBody detail={d} canCorrect={canCorrect} />}
      {d && mode && <CorrectionModal detail={d} mode={mode} onClose={() => setMode(null)} />}
    </Drawer>
  );
}

function DetailBody({ detail: d, canCorrect }: { detail: ChargeDetail; canCorrect: boolean }) {
  const c = d.charge;
  const lockedReason = !d.correctable && (c.status === 'UNPAID' || c.status === 'EXEMPT')
    ? (d.payments.length > 0
      ? 'Khoản đã có lần thu nên không điều chỉnh hoặc hủy được; cần hoàn tiền trước.'
      : 'Kỳ của khoản không còn ở trạng thái đang thu nên không điều chỉnh hoặc hủy được.')
    : null;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {c.status === 'CANCELLED' && (
        <Alert
          type="error"
          showIcon
          message={<>Đã hủy {c.cancelledAt && <>lúc <DateText value={c.cancelledAt} withTime /></>}</>}
          description={<>Lý do: {c.cancelReason}</>}
        />
      )}
      {canCorrect && lockedReason && <Alert type="info" showIcon message={lockedReason} />}
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Đối tượng" span={2}>
          <strong>{c.subjectName}</strong> · {c.subjectCode}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ" span={2}>{c.subjectAddress || '—'}</Descriptions.Item>
        <Descriptions.Item label="Ấp">{d.areaName}</Descriptions.Item>
        <Descriptions.Item label="Công ty">{d.companyName}</Descriptions.Item>
        <Descriptions.Item label="Kỳ">{d.periodLabel}</Descriptions.Item>
        <Descriptions.Item label="Loại phí">{d.feeTypeName}</Descriptions.Item>
        <Descriptions.Item label="Biểu giá">{d.tariffCode ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Nhóm giá">{c.tariffGroup ? TARIFF_GROUP_LABELS[c.tariffGroup] : '—'}</Descriptions.Item>
        <Descriptions.Item label={d.quotaKg != null ? 'Định mức' : 'Nhân khẩu'}>
          {d.quotaKg != null ? `${d.quotaKg.toLocaleString('vi-VN')} kg/tháng` : (c.memberCount ?? '—')}
        </Descriptions.Item>
        <Descriptions.Item label="Đơn giá"><MoneyText value={c.unitPrice} /></Descriptions.Item>
        <Descriptions.Item label="Số tháng">{c.months}</Descriptions.Item>
        <Descriptions.Item label="Số tiền"><MoneyText value={c.amount} strong /></Descriptions.Item>
        <Descriptions.Item label="Đã thu"><MoneyText value={d.paidAmount} /></Descriptions.Item>
        <Descriptions.Item label="Hạn đóng"><DateText value={c.dueDate} /></Descriptions.Item>
        <Descriptions.Item label="Phiếu YCT" span={2}>{c.requestCode}</Descriptions.Item>
      </Descriptions>

      {d.payments.length > 0 && (
        <div>
          <Typography.Title level={5}>Lần thu</Typography.Title>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={d.payments}
            columns={[
              { title: 'Mã', dataIndex: 'code' },
              { title: 'Ngày', render: (_, p) => <DateText value={p.paidAt} withTime /> },
              { title: 'Hình thức', render: (_, p) => PAYMENT_METHOD_LABELS[p.method] },
              { title: 'Số tiền', align: 'right', render: (_, p) => <MoneyText value={p.amount} /> },
            ]}
          />
        </div>
      )}

      {d.adjustments.length > 0 && (
        <div>
          <Typography.Title level={5}>Lịch sử điều chỉnh</Typography.Title>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={d.adjustments}
            columns={[
              { title: 'Thời gian', width: 150, render: (_, a) => <DateText value={a.createdAt} withTime /> },
              {
                title: 'Thay đổi',
                width: 280,
                render: (_, a) => (a.type === 'CANCEL'
                  ? <>Hủy khoản (<MoneyText value={a.oldAmount} />)</>
                  : (
                    <>
                      {a.oldTariffGroup && a.newTariffGroup && (
                        <div style={{ fontSize: 13 }}>
                          {TARIFF_GROUP_LABELS[a.oldTariffGroup]}{quantityLabel(a.oldTariffGroup, a.oldQuantity)}
                          {' → '}
                          {TARIFF_GROUP_LABELS[a.newTariffGroup]}{quantityLabel(a.newTariffGroup, a.newQuantity)}
                        </div>
                      )}
                      <MoneyText value={a.oldAmount} /> → <MoneyText value={a.newAmount} strong />
                    </>
                  )),
              },
              { title: 'Lý do', dataIndex: 'reason' },
            ]}
          />
        </div>
      )}
    </Space>
  );
}

function CorrectionModal({ detail, mode, onClose }: { detail: ChargeDetail; mode: 'adjust' | 'cancel'; onClose: () => void }) {
  const c = detail.charge;
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const { adjust, cancel } = useCorrectCharge(c.id);
  const mutation = mode === 'adjust' ? adjust : cancel;
  const group = Form.useWatch('tariffGroup', form);
  const memberCount = Form.useWatch('memberCount', form);
  const quotaKg = Form.useWatch('quotaKg', form);
  const rate = detail.tariffRates.find((r) => r.group === group);
  const perKg = group != null && PER_KG.includes(group);
  const perCapita = group === 'HH_PER_CAPITA';
  const quantity = perKg ? quotaKg : perCapita ? memberCount : 1;
  const newAmount = rate && quantity ? rate.monthlyTotal * quantity * c.months : null;
  const currentQty = c.tariffGroup && PER_KG.includes(c.tariffGroup) ? detail.quotaKg : c.memberCount;

  function finish(v: FormValues) {
    const reason = v.reason!.trim();
    const done = () => {
      message.success(mode === 'adjust' ? `Đã điều chỉnh khoản ${c.code}` : `Đã hủy khoản ${c.code}`);
      onClose();
    };
    if (mode === 'adjust') {
      adjust.mutate(
        {
          tariffGroup: v.tariffGroup!,
          memberCount: perCapita ? v.memberCount : undefined,
          quotaKg: perKg ? v.quotaKg : undefined,
          reason,
        },
        { onSuccess: done },
      );
    } else {
      cancel.mutate(reason, { onSuccess: done });
    }
  }

  return (
    <Modal
      title={mode === 'adjust' ? `Điều chỉnh theo biểu giá · ${c.code}` : `Hủy khoản · ${c.code}`}
      open
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={mode === 'adjust' ? 'Lưu điều chỉnh' : 'Hủy khoản'}
      okButtonProps={{ danger: mode === 'cancel' }}
      cancelText="Đóng"
      confirmLoading={mutation.isPending}
      destroyOnHidden
    >
      {mutation.error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={errorTextOrNull(mutation.error)} />}
      <Typography.Paragraph>
        Hiện tại: {c.tariffGroup ? TARIFF_GROUP_LABELS[c.tariffGroup] : '—'}
        {quantityLabel(c.tariffGroup, currentQty)} · <MoneyText value={c.amount} strong />
        {mode === 'adjust' && detail.tariffCode && (
          <><br />Biểu giá của kỳ: <strong>{detail.tariffCode}</strong>{c.months > 1 && ` · ${c.months} tháng`}</>
        )}
        {mode === 'cancel' && (
          <><br />Khoản đã hủy không tính vào phải thu, hộ không phải đóng; có thể lập lại khoản đúng bằng phiếu yêu cầu thu.</>
        )}
      </Typography.Paragraph>
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={mode === 'adjust'
          ? { tariffGroup: c.tariffGroup ?? undefined, memberCount: c.memberCount ?? undefined, quotaKg: detail.quotaKg ?? undefined }
          : undefined}
        onFinish={finish}
      >
        {mode === 'adjust' && (
          <>
            <Form.Item label="Nhóm giá" name="tariffGroup" rules={[{ required: true, message: 'Vui lòng chọn nhóm giá' }]}>
              <Select<TariffGroup>
                options={detail.tariffRates.map((r) => ({
                  value: r.group,
                  label: `${TARIFF_GROUP_LABELS[r.group]} · ${r.monthlyTotal.toLocaleString('vi-VN')} ${r.unitLabel}`,
                }))}
              />
            </Form.Item>
            {perCapita && (
              <Form.Item
                label="Số nhân khẩu"
                name="memberCount"
                rules={[{ required: true, message: 'Vui lòng nhập số nhân khẩu' }, { type: 'number', min: 1, message: 'Phải lớn hơn 0' }]}
              >
                <InputNumber<number> style={{ width: '100%' }} min={1} precision={0} addonAfter="người" />
              </Form.Item>
            )}
            {perKg && (
              <Form.Item
                label="Định mức"
                name="quotaKg"
                rules={[{ required: true, message: 'Vui lòng nhập định mức' }, { type: 'number', min: 1, message: 'Phải lớn hơn 0' }]}
              >
                <InputNumber<number> style={{ width: '100%' }} min={1} precision={0} addonAfter="kg/tháng" />
              </Form.Item>
            )}
            <Alert
              type="info"
              style={{ marginBottom: 16 }}
              message={newAmount != null && rate
                ? (
                  <>
                    Số tiền mới: <MoneyText value={newAmount} strong /> ({formatMoney(rate.monthlyTotal)} × {quantity}
                    {c.months > 1 ? ` × ${c.months} tháng` : ''})
                  </>
                )
                : 'Chọn nhóm giá để xem số tiền mới.'}
            />
          </>
        )}
        <Form.Item
          label={mode === 'adjust' ? 'Lý do điều chỉnh' : 'Lý do hủy'}
          name="reason"
          rules={[{ required: true, whitespace: true, message: 'Vui lòng ghi lý do' }]}
        >
          <Input.TextArea rows={3} maxLength={2000} showCount placeholder="Ví dụ: lập sai nhóm giá, sai số nhân khẩu…" />
        </Form.Item>
      </Form>
      {mode === 'adjust' && (
        <Typography.Text type="secondary">
          Chỉ sửa khoản này. Nếu đăng ký thu phí của hộ sai, sửa thêm ở hồ sơ hộ để các kỳ sau đúng.
        </Typography.Text>
      )}
    </Modal>
  );
}
