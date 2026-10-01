import { Alert, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import type { CreateTariffRequest, TariffDraftRequest, TariffRate, TariffVersion } from '../api';

type Group = TariffRate['tariffGroup'];
const GROUPS = Object.keys(TARIFF_GROUP_LABELS) as Group[];
/** Đơn vị tính cố định theo nhóm: chủ nguồn thải 500–9.000 kg tính theo ký, còn lại theo tháng. */
const unitOf = (g: Group) => (g === 'BY_VOLUME' ? 'đ/kg' : g.startsWith('HH_') ? 'đ/hộ/tháng' : 'đ/tháng');

interface RateValues {
  tariffGroup: Group;
  collectionFee?: number | null;
  transportFee?: number | null;
  unitLabel?: string;
}

interface FormValues {
  code?: string;
  legalBasis?: string;
  validFrom?: Dayjs;
  validTo?: Dayjs | null;
  scopeNote?: string | null;
  note?: string | null;
  rates: RateValues[];
}

interface Props {
  /** Biểu giá đang sửa; null = tạo mới. */
  draft: TariffVersion | null;
  /** Bản lấy đơn giá gợi ý khi tạo mới (thường là bản đang áp dụng). */
  template?: TariffVersion;
  open: boolean;
  submitting?: boolean;
  error?: string | null;
  onCreate: (req: CreateTariffRequest) => void;
  onUpdate: (req: TariffDraftRequest) => void;
  onCancel: () => void;
}

const optional = (s?: string | null) => s?.trim() || undefined;
const money = {
  min: 0,
  step: 1000,
  style: { width: '100%' },
  formatter: (v?: number | string) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN')),
  parser: (v?: string) => Number((v ?? '').replace(/\D/g, '')),
};

/** Popup soạn dự thảo biểu giá: đủ đơn giá các nhóm; tổng = thu gom + vận chuyển. */
export function TariffFormModal({ draft, template, open, submitting, error, onCreate, onUpdate, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const rates = Form.useWatch('rates', form);
  const source = draft ?? template;
  const issued = !!draft && draft.status !== 'DRAFT';

  const initial: FormValues = {
    code: draft?.code,
    legalBasis: draft?.legalBasis,
    validFrom: draft ? dayjs(draft.validFrom) : undefined,
    validTo: draft?.validTo ? dayjs(draft.validTo) : null,
    scopeNote: draft?.scopeNote,
    note: draft?.note,
    rates: GROUPS.map((g) => {
      const r = source?.rates.find((x) => x.tariffGroup === g);
      return { tariffGroup: g, collectionFee: r?.collectionFee, transportFee: r?.transportFee, unitLabel: unitOf(g) };
    }),
  };

  function finish(v: FormValues) {
    const body: TariffDraftRequest = {
      legalBasis: v.legalBasis!.trim(),
      validFrom: v.validFrom!.format('YYYY-MM-DD'),
      validTo: v.validTo ? v.validTo.format('YYYY-MM-DD') : undefined,
      scopeNote: optional(v.scopeNote),
      note: optional(v.note),
      rates: v.rates.map((r) => ({
        tariffGroup: r.tariffGroup,
        collectionFee: r.collectionFee!,
        transportFee: r.transportFee!,
        unitLabel: r.unitLabel!.trim(),
      })),
    };
    if (draft) onUpdate(body);
    else onCreate({ code: v.code!.trim(), draft: body });
  }

  const required = (message: string) => [{ required: true, message }];

  return (
    <Modal
      title={draft ? `Sửa ${issued ? 'biểu giá' : 'dự thảo'} ${draft.code}` : 'Tạo dự thảo biểu giá'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={issued ? 'Lưu thay đổi' : draft ? 'Lưu dự thảo' : 'Tạo dự thảo'}
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
      width={900}
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} preserve={false} initialValues={initial} onFinish={finish}>
        {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
        {issued && <Typography.Paragraph type="secondary">
          Thay đổi áp dụng cho khoản lập sau khi lưu. Khoản đã lập giữ nguyên số tiền; ngày hiệu lực không thay đổi.
        </Typography.Paragraph>}
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Mã biểu giá" name="code" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã' }]}>
              <Input maxLength={20} placeholder="BG-70-2027" disabled={!!draft} />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item label="Căn cứ pháp lý" name="legalBasis" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập căn cứ' }]}>
              <Input maxLength={100} placeholder="QĐ 70/2026/QĐ-UBND" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label="Hiệu lực từ" name="validFrom" rules={required('Vui lòng chọn ngày')}>
              <DatePicker disabled={issued} format="DD/MM/YYYY" placeholder="dd/mm/yyyy" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item
              label="Hiệu lực đến"
              name="validTo"
              dependencies={['validFrom']}
              extra="Để trống là không thời hạn"
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, v?: Dayjs | null) =>
                    !v || !getFieldValue('validFrom') || !v.isBefore(getFieldValue('validFrom'), 'day')
                      ? Promise.resolve()
                      : Promise.reject(new Error('Phải từ ngày hiệu lực trở đi')),
                }),
              ]}
            >
              <DatePicker disabled={issued} format="DD/MM/YYYY" placeholder="dd/mm/yyyy" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Phạm vi áp dụng" name="scopeNote">
              <Input maxLength={255} />
            </Form.Item>
          </Col>
        </Row>

        <Typography.Text strong>Đơn giá theo nhóm</Typography.Text>
        <Row gutter={12} style={{ margin: '8px 0 4px', color: 'rgba(0,0,0,.55)', fontSize: 12 }}>
          <Col span={8}>Nhóm giá</Col>
          <Col span={4}>Thu gom (đ)</Col>
          <Col span={4}>Vận chuyển (đ)</Col>
          <Col span={3}>Đơn vị tính</Col>
          <Col span={5} style={{ textAlign: 'right' }}>Tổng cộng</Col>
        </Row>
        <Form.List name="rates">
          {(fields) =>
            fields.map((f, i) => {
              const r = rates?.[i];
              return (
                <Row key={f.key} gutter={12} align="top">
                  <Col span={8} style={{ paddingTop: 5 }}>
                    {TARIFF_GROUP_LABELS[initial.rates[i]!.tariffGroup]}
                  </Col>
                  <Col span={4}>
                    <Form.Item name={[f.name, 'collectionFee']} rules={required('Nhập số')}>
                      <InputNumber<number> {...money} aria-label={`Thu gom ${TARIFF_GROUP_LABELS[initial.rates[i]!.tariffGroup]}`} />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item name={[f.name, 'transportFee']} rules={required('Nhập số')}>
                      <InputNumber<number> {...money} aria-label={`Vận chuyển ${TARIFF_GROUP_LABELS[initial.rates[i]!.tariffGroup]}`} />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Form.Item name={[f.name, 'unitLabel']} rules={[{ required: true, whitespace: true, message: 'Nhập' }]}>
                      <Input maxLength={30} disabled />
                    </Form.Item>
                  </Col>
                  <Col span={5} style={{ paddingTop: 5, textAlign: 'right' }}>
                    <MoneyText value={(r?.collectionFee ?? 0) + (r?.transportFee ?? 0)} strong />
                  </Col>
                </Row>
              );
            })
          }
        </Form.List>
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
