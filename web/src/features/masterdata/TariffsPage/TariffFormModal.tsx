import { Alert, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import type { CreateTariffRequest, TariffDraftRequest, TariffRate, TariffVersion } from '../api';

type Group = TariffRate['tariffGroup'];
const GROUPS: Group[] = ['HH_UP_TO_2', 'HH_3_PLUS', 'SMALL_GENERATOR', 'BY_VOLUME'];

interface RateValues {
  tariffGroup: Group;
  collectionFee?: number | null;
  processingFee?: number | null;
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
  /** Dự thảo đang sửa; null = tạo mới. */
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

/** Popup soạn dự thảo biểu giá: đủ đơn giá 4 nhóm; tổng mỗi tháng = thu gom + xử lý. */
export function TariffFormModal({ draft, template, open, submitting, error, onCreate, onUpdate, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const rates = Form.useWatch('rates', form);
  const source = draft ?? template;

  const initial: FormValues = {
    code: draft?.code,
    legalBasis: draft?.legalBasis,
    validFrom: draft ? dayjs(draft.validFrom) : undefined,
    validTo: draft?.validTo ? dayjs(draft.validTo) : null,
    scopeNote: draft?.scopeNote,
    note: draft?.note,
    rates: GROUPS.map((g) => {
      const r = source?.rates.find((x) => x.tariffGroup === g);
      return { tariffGroup: g, collectionFee: r?.collectionFee, processingFee: r?.processingFee, unitLabel: r?.unitLabel };
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
        processingFee: r.processingFee!,
        unitLabel: r.unitLabel!.trim(),
      })),
    };
    if (draft) onUpdate(body);
    else onCreate({ code: v.code!.trim(), draft: body });
  }

  const required = (message: string) => [{ required: true, message }];

  return (
    <Modal
      title={draft ? `Sửa dự thảo ${draft.code}` : 'Tạo dự thảo biểu giá'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={draft ? 'Lưu dự thảo' : 'Tạo dự thảo'}
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
      width={760}
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} preserve={false} initialValues={initial} onFinish={finish}>
        {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
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
              <DatePicker format="DD/MM/YYYY" placeholder="dd/mm/yyyy" style={{ width: '100%' }} />
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
              <DatePicker format="DD/MM/YYYY" placeholder="dd/mm/yyyy" style={{ width: '100%' }} />
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
          <Col span={6}>Nhóm giá</Col>
          <Col span={5}>Thu gom (đ)</Col>
          <Col span={5}>Xử lý (đ)</Col>
          <Col span={4}>Đơn vị tính</Col>
          <Col span={4} style={{ textAlign: 'right' }}>Tổng mỗi tháng</Col>
        </Row>
        <Form.List name="rates">
          {(fields) =>
            fields.map((f, i) => {
              const r = rates?.[i];
              return (
                <Row key={f.key} gutter={12} align="top">
                  <Col span={6} style={{ paddingTop: 5 }}>
                    {TARIFF_GROUP_LABELS[initial.rates[i]!.tariffGroup]}
                  </Col>
                  <Col span={5}>
                    <Form.Item name={[f.name, 'collectionFee']} rules={required('Nhập số')}>
                      <InputNumber<number> {...money} aria-label={`Thu gom ${TARIFF_GROUP_LABELS[initial.rates[i]!.tariffGroup]}`} />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item name={[f.name, 'processingFee']} rules={required('Nhập số')}>
                      <InputNumber<number> {...money} aria-label={`Xử lý ${TARIFF_GROUP_LABELS[initial.rates[i]!.tariffGroup]}`} />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item name={[f.name, 'unitLabel']} rules={[{ required: true, whitespace: true, message: 'Nhập' }]}>
                      <Input maxLength={30} placeholder="đ/hộ/tháng" />
                    </Form.Item>
                  </Col>
                  <Col span={4} style={{ paddingTop: 5, textAlign: 'right' }}>
                    <MoneyText value={(r?.collectionFee ?? 0) + (r?.processingFee ?? 0)} strong />
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
