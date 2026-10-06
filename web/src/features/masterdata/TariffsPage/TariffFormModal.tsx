import { Alert, Checkbox, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { useDistricts, type CreateTariffRequest, type TariffDraftRequest, type TariffRate, type TariffVersion } from '../api';

type Group = TariffRate['tariffGroup'];
const GROUPS = Object.keys(TARIFF_GROUP_LABELS) as Group[];
/** Đơn vị tính cố định theo nhóm: nhóm cân theo ký, nhân khẩu theo người, còn lại theo tháng. */
const unitOf = (g: Group) =>
  g === 'BY_VOLUME' || g === 'FULL_COST_BY_KG' ? 'đ/kg'
    : g === 'HH_PER_CAPITA' ? 'đ/người/tháng'
      : g.startsWith('HH_') ? 'đ/hộ/tháng' : 'đ/tháng';
/** Chỉ nhóm cân như nguồn thải lớn có phí xử lý (bảng mục 3 QĐ 65/2026). */
const hasProcessing = (g: Group) => g === 'FULL_COST_BY_KG';

interface RateValues {
  tariffGroup: Group;
  collectionFee?: number | null;
  transportFee?: number | null;
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
  perCapita: boolean;
  perCapitaAll: boolean;
  perCapitaDistrictIds: number[];
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

/** Popup soạn dự thảo biểu giá: đủ đơn giá các nhóm; tổng = thu gom + vận chuyển + xử lý; bật thu theo nhân khẩu. */
export function TariffFormModal({ draft, template, open, submitting, error, onCreate, onUpdate, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const rates = Form.useWatch('rates', form);
  const perCapita = Form.useWatch('perCapita', form);
  const perCapitaAll = Form.useWatch('perCapitaAll', form);
  const { data: districts } = useDistricts();
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
      return {
        tariffGroup: g, collectionFee: r?.collectionFee, transportFee: r?.transportFee,
        processingFee: r?.processingFee ?? 0, unitLabel: unitOf(g),
      };
    }),
    perCapita: !!draft && (draft.perCapitaAll || draft.perCapitaDistrictIds.length > 0),
    perCapitaAll: draft?.perCapitaAll ?? false,
    perCapitaDistrictIds: draft?.perCapitaDistrictIds ?? [],
  };

  function finish(v: FormValues) {
    const body: TariffDraftRequest = {
      legalBasis: v.legalBasis!.trim(),
      validFrom: v.validFrom!.format('YYYY-MM-DD'),
      validTo: v.validTo ? v.validTo.format('YYYY-MM-DD') : undefined,
      scopeNote: optional(v.scopeNote),
      note: optional(v.note),
      // Đơn giá một người chỉ gửi khi đã nhập (bắt buộc khi bật theo nhân khẩu).
      rates: v.rates
        .filter((r) => r.tariffGroup !== 'HH_PER_CAPITA' || r.collectionFee != null || r.transportFee != null)
        .map((r) => ({
          tariffGroup: r.tariffGroup,
          collectionFee: r.collectionFee ?? 0,
          transportFee: r.transportFee ?? 0,
          processingFee: hasProcessing(r.tariffGroup) ? (r.processingFee ?? 0) : 0,
          unitLabel: r.unitLabel!.trim(),
        })),
      perCapitaAll: v.perCapita && v.perCapitaAll,
      perCapitaDistrictIds: v.perCapita && !v.perCapitaAll ? v.perCapitaDistrictIds : [],
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
          <Col span={6}>Nhóm giá</Col>
          <Col span={4}>Thu gom (đ)</Col>
          <Col span={4}>Vận chuyển (đ)</Col>
          <Col span={3}>Xử lý (đ)</Col>
          <Col span={3}>Đơn vị tính</Col>
          <Col span={4} style={{ textAlign: 'right' }}>Tổng cộng</Col>
        </Row>
        <Form.List name="rates">
          {(fields) =>
            fields.map((f, i) => {
              const r = rates?.[i];
              const g = initial.rates[i]!.tariffGroup;
              // Đơn giá một người chưa có số chính thức: chỉ bắt buộc khi bật theo nhân khẩu.
              const rule = g === 'HH_PER_CAPITA' && !perCapita ? [] : required('Nhập số');
              return (
                <Row key={f.key} gutter={12} align="top">
                  <Col span={6} style={{ paddingTop: 5 }}>
                    {TARIFF_GROUP_LABELS[g]}
                  </Col>
                  <Col span={4}>
                    <Form.Item name={[f.name, 'collectionFee']} rules={rule}>
                      <InputNumber<number> {...money} aria-label={`Thu gom ${TARIFF_GROUP_LABELS[g]}`} />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item name={[f.name, 'transportFee']} rules={rule}>
                      <InputNumber<number> {...money} aria-label={`Vận chuyển ${TARIFF_GROUP_LABELS[g]}`} />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    {hasProcessing(g) ? (
                      <Form.Item name={[f.name, 'processingFee']} rules={required('Nhập số')}>
                        <InputNumber<number> {...money} aria-label={`Xử lý ${TARIFF_GROUP_LABELS[g]}`} />
                      </Form.Item>
                    ) : <div style={{ paddingTop: 5 }}>—</div>}
                  </Col>
                  <Col span={3}>
                    <Form.Item name={[f.name, 'unitLabel']} rules={[{ required: true, whitespace: true, message: 'Nhập' }]}>
                      <Input maxLength={30} disabled />
                    </Form.Item>
                  </Col>
                  <Col span={4} style={{ paddingTop: 5, textAlign: 'right' }}>
                    <MoneyText value={(r?.collectionFee ?? 0) + (r?.transportFee ?? 0) + (hasProcessing(g) ? (r?.processingFee ?? 0) : 0)} strong />
                  </Col>
                </Row>
              );
            })
          }
        </Form.List>
        <Form.Item name="perCapita" valuePropName="checked" style={{ marginBottom: 8 }}>
          <Checkbox>Thu hộ gia đình theo nhân khẩu (đơn giá một người × số nhân khẩu)</Checkbox>
        </Form.Item>
        {perCapita && (
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="perCapitaAll" valuePropName="checked">
                <Checkbox>Toàn xã</Checkbox>
              </Form.Item>
            </Col>
            {!perCapitaAll && (
              <Col xs={24} md={16}>
                <Form.Item
                  label="Địa bàn áp dụng"
                  name="perCapitaDistrictIds"
                  rules={[{ required: true, type: 'array', min: 1, message: 'Chọn ít nhất một địa bàn hoặc Toàn xã' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn địa bàn"
                    options={districts?.map((d) => ({ value: d.id, label: d.name }))}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        )}
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
