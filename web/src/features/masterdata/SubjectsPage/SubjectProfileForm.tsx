import { Alert, Button, Checkbox, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space, Tag, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { SUBJECT_TYPE_LABELS, TARIFF_GROUP_LABELS, type SubjectType, type TariffGroup } from '../../../shared/labels';
import type { Area, ContractRequest, Subject, SubjectRequest } from '../api';

export interface ProfileSubmit {
  subject: SubjectRequest;
  /** Hợp đồng cần ghi: sửa hợp đồng hiện tại ({@link contractId}) hoặc tạo mới; null nếu không có. */
  contract: ContractRequest | null;
  contractId: number | null;
}

interface FormValues {
  type: SubjectType;
  name: string;
  address: string;
  areaId?: number;
  phone?: string;
  memberCount?: number | null;
  representativeName?: string;
  taxCode?: string;
  note?: string;
  hasContract: boolean;
  tariffGroup?: TariffGroup;
  validFrom?: Dayjs | null;
  validTo?: Dayjs | null;
}

const DATE_FORMAT = 'DD/MM/YYYY';
const iso = (d: Dayjs | null | undefined) => (d ? d.format('YYYY-MM-DD') : undefined);
const trimmed = (s: string | undefined) => (s && s.trim() ? s.trim() : undefined);

interface Props {
  subject?: Subject;
  areas: Area[];
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: ProfileSubmit) => void;
  onCancel?: () => void;
}

/** Form "Hồ sơ hộ": khối Thông tin hộ và khối Hợp đồng trên cùng một form (T16). Cờ miễn 100% chỉ hiển thị. */
export function SubjectProfileForm({ subject, areas, submitting = false, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const type = Form.useWatch('type', form) ?? subject?.subjectType ?? 'HOUSEHOLD';
  const hasContract = Form.useWatch('hasContract', form);
  const current = subject?.currentContract ?? null;
  const showContract = current !== null || hasContract;

  const initialValues: Partial<FormValues> = subject
    ? {
        type: subject.subjectType,
        name: subject.name,
        address: subject.address,
        areaId: subject.areaId,
        phone: subject.phone ?? undefined,
        memberCount: subject.memberCount,
        representativeName: subject.representativeName ?? undefined,
        taxCode: subject.taxCode ?? undefined,
        note: subject.note ?? undefined,
        hasContract: current !== null,
        tariffGroup: current?.tariffGroup,
        validFrom: current ? dayjs(current.validFrom) : undefined,
        validTo: current?.validTo ? dayjs(current.validTo) : undefined,
      }
    : { type: 'HOUSEHOLD', hasContract: true };

  function finish(v: FormValues) {
    const subjectReq: SubjectRequest = {
      type: v.type,
      name: v.name.trim(),
      address: v.address.trim(),
      areaId: v.areaId!,
      phone: trimmed(v.phone),
      memberCount: v.type === 'HOUSEHOLD' ? (v.memberCount ?? undefined) : undefined,
      representativeName: v.type === 'HOUSEHOLD' ? undefined : trimmed(v.representativeName),
      taxCode: v.type === 'HOUSEHOLD' ? undefined : trimmed(v.taxCode),
      note: trimmed(v.note),
    };
    const contract: ContractRequest | null =
      current !== null || v.hasContract
        ? {
            tariffGroup: v.tariffGroup!,
            validFrom: iso(v.validFrom)!,
            validTo: iso(v.validTo),
            // Miễn 100% không sửa trên form này: giữ nguyên giá trị của hợp đồng hiện tại.
            exempt: current?.exempt ?? false,
            exemptReason: current?.exemptReason ?? undefined,
            exemptDecisionNo: current?.exemptDecisionNo ?? undefined,
          }
        : null;
    onSubmit({ subject: subjectReq, contract, contractId: current?.id ?? null });
  }

  return (
    <Form<FormValues> form={form} layout="vertical" requiredMark={false} disabled={submitting} initialValues={initialValues} onFinish={finish}>
      {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
      <Typography.Title level={5}>Thông tin hộ</Typography.Title>
      {subject && (
        <Typography.Paragraph type="secondary">
          Mã đối tượng: <Typography.Text strong>{subject.code}</Typography.Text>
        </Typography.Paragraph>
      )}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="Loại đối tượng" name="type" rules={[{ required: true, message: 'Vui lòng chọn loại' }]}>
            <Select
              aria-label="Loại đối tượng"
              options={Object.entries(SUBJECT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Tổ dân phố" name="areaId" rules={[{ required: true, message: 'Vui lòng chọn tổ' }]}>
            <Select
              aria-label="Tổ dân phố"
              showSearch
              optionFilterProp="label"
              placeholder="Chọn tổ"
              options={areas.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        label={type === 'HOUSEHOLD' ? 'Tên chủ hộ' : 'Tên cơ sở'}
        name="name"
        rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên' }]}
      >
        <Input maxLength={200} />
      </Form.Item>
      <Form.Item label="Địa chỉ" name="address" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập địa chỉ' }]}>
        <Input maxLength={255} placeholder="Số nhà, hẻm, đường" />
      </Form.Item>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[{ pattern: /^[0-9]{9,15}$/, message: 'Số điện thoại chỉ gồm 9–15 chữ số' }]}
          >
            <Input inputMode="numeric" maxLength={15} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          {type === 'HOUSEHOLD' ? (
            <Form.Item label="Số nhân khẩu" name="memberCount">
              <InputNumber min={1} max={99} style={{ width: '100%' }} />
            </Form.Item>
          ) : (
            <Form.Item label="Người đại diện" name="representativeName">
              <Input maxLength={100} />
            </Form.Item>
          )}
        </Col>
      </Row>
      {type !== 'HOUSEHOLD' && (
        <Form.Item label="Mã số thuế" name="taxCode">
          <Input maxLength={14} />
        </Form.Item>
      )}
      <Form.Item label="Ghi chú" name="note">
        <Input.TextArea rows={2} maxLength={2000} />
      </Form.Item>

      <Divider />
      <Typography.Title level={5}>Hợp đồng</Typography.Title>
      {current ? (
        <Typography.Paragraph type="secondary">
          Số đăng ký: <Typography.Text strong>{current.contractNo}</Typography.Text>{' '}
          {current.exempt && <Tag color="purple">Miễn 100% · {current.exemptReason}</Tag>}
        </Typography.Paragraph>
      ) : (
        <Form.Item name="hasContract" valuePropName="checked">
          <Checkbox>Đăng ký dịch vụ cho hộ này</Checkbox>
        </Form.Item>
      )}
      {showContract && (
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Nhóm giá" name="tariffGroup" rules={[{ required: true, message: 'Vui lòng chọn nhóm giá' }]}>
              <Select
                aria-label="Nhóm giá"
                placeholder="Chọn nhóm"
                options={Object.entries(TARIFF_GROUP_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label="Hiệu lực từ" name="validFrom" rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}>
              <DatePicker format={DATE_FORMAT} placeholder="dd/mm/yyyy" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item
              label="Hiệu lực đến"
              name="validTo"
              dependencies={['validFrom']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value: Dayjs | null | undefined) {
                    const from: Dayjs | undefined = getFieldValue('validFrom');
                    if (!value || !from || !value.isBefore(from, 'day')) return Promise.resolve();
                    return Promise.reject(new Error('Ngày hết hiệu lực không được trước ngày bắt đầu'));
                  },
                }),
              ]}
            >
              <DatePicker format={DATE_FORMAT} placeholder="Không thời hạn" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )}
      <Space>
        <Button type="primary" htmlType="submit" loading={submitting}>
          {subject ? 'Lưu hồ sơ' : 'Tạo hồ sơ'}
        </Button>
        {onCancel && <Button onClick={onCancel}>Hủy</Button>}
      </Space>
    </Form>
  );
}
