import { Alert, Button, Checkbox, Col, DatePicker, Divider, Form, Input, InputNumber, List, Row, Select, Space, Tag, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';

import {
  SUBJECT_STATUS_COLORS,
  SUBJECT_STATUS_LABELS,
  SUBJECT_TYPE_LABELS,
  TARIFF_GROUP_LABELS,
  type SubjectType,
  type TariffGroup,
} from '../../../shared/labels';
import { type Area, type ContractRequest, checkDuplicates, type DuplicateSubject, type Subject, type SubjectRequest } from '../api';
import { StreetSearch, type StreetValue } from './StreetSearch';

export interface ProfileSubmit {
  subject: SubjectRequest;
  /** Hợp đồng cần ghi: sửa hợp đồng hiện tại ({@link contractId}) hoặc tạo mới; null nếu không có. */
  contract: ContractRequest | null;
  contractId: number | null;
}

interface FormValues {
  type: SubjectType;
  name: string;
  houseNo?: string;
  unitNo?: string;
  locationNote?: string;
  street?: StreetValue;
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

/** Như máy chủ (TARIFF_GROUP_MISMATCH): hợp đồng đang mở theo nhóm số người phải khớp số thành viên hiện tại. */
const groupFitsMembers = ({ getFieldValue }: { getFieldValue: (name: keyof FormValues) => unknown }) => ({
  validator(_: unknown, group: TariffGroup | undefined) {
    if ((group !== 'HH_UP_TO_2' && group !== 'HH_3_PLUS') || getFieldValue('validTo')) return Promise.resolve();
    if (getFieldValue('type') !== 'HOUSEHOLD') {
      return Promise.reject(new Error('Nhóm giá theo số người chỉ dùng cho hộ gia đình'));
    }
    const members = getFieldValue('memberCount') as number | null | undefined;
    const expected: TariffGroup = members && members <= 2 ? 'HH_UP_TO_2' : 'HH_3_PLUS';
    if (!members || group === expected) return Promise.resolve();
    return Promise.reject(new Error(`Hộ có ${members} thành viên phải chọn nhóm "${TARIFF_GROUP_LABELS[expected]}"`));
  },
});

interface Props {
  subject?: Subject;
  areas: Area[];
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: ProfileSubmit) => void;
  onCancel?: () => void;
  /** Mở hồ sơ đã có khi cảnh báo nghi trùng (không có thì ẩn nút). */
  onOpenExisting?: (id: number) => void;
}

/** Form "Hồ sơ hộ": khối Thông tin hộ và khối Hợp đồng trên cùng một form (T16). Cờ miễn 100% chỉ hiển thị. */
export function SubjectProfileForm({ subject, areas, submitting = false, error, onSubmit, onCancel, onOpenExisting }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [checking, setChecking] = useState(false);
  const [dupes, setDupes] = useState<DuplicateSubject[] | null>(null);
  const [distinct, setDistinct] = useState(false);
  const [reason, setReason] = useState('');
  const areaId = Form.useWatch('areaId', form) ?? subject?.areaId;
  const districtId = areas.find((a) => a.id === areaId)?.districtId;
  const type = Form.useWatch('type', form) ?? subject?.subjectType ?? 'HOUSEHOLD';
  const hasContract = Form.useWatch('hasContract', form);
  const current = subject?.currentContract ?? null;
  const showContract = current !== null || hasContract;

  const initialValues: Partial<FormValues> = subject
    ? {
        type: subject.subjectType,
        name: subject.name,
        houseNo: subject.houseNo ?? undefined,
        unitNo: subject.unitNo ?? undefined,
        locationNote: subject.locationNote ?? undefined,
        street: { streetId: subject.streetId ?? undefined, street: subject.street, pending: subject.streetPending },
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

  /** Đường chuẩn: chỉ gửi streetId; đường chờ xác minh / địa chỉ cũ: gửi tên tạm. */
  function buildSubject(v: FormValues, duplicateReason?: string): SubjectRequest {
    const street = v.street!;
    return {
      type: v.type,
      name: v.name.trim(),
      houseNo: trimmed(v.houseNo),
      unitNo: trimmed(v.unitNo),
      locationNote: trimmed(v.locationNote),
      streetId: street.streetId,
      street: street.streetId ? undefined : street.street.trim(),
      streetPending: street.streetId ? undefined : street.pending,
      duplicateReason,
      areaId: v.areaId!,
      phone: trimmed(v.phone),
      memberCount: v.type === 'HOUSEHOLD' ? (v.memberCount ?? undefined) : undefined,
      representativeName: v.type === 'HOUSEHOLD' ? undefined : trimmed(v.representativeName),
      taxCode: v.type === 'HOUSEHOLD' ? undefined : trimmed(v.taxCode),
      note: trimmed(v.note),
    };
  }

  /** Địa chỉ đổi so với hồ sơ đang sửa? Hộ vốn đã trùng mà không đổi địa chỉ thì không hỏi lại (như backend). */
  function addressChanged(v: FormValues) {
    if (!subject) return true;
    const same = (a?: string | null, b?: string | null) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
    return !(
      v.areaId === subject.areaId &&
      v.street?.streetId === (subject.streetId ?? undefined) &&
      same(v.houseNo, subject.houseNo) &&
      same(v.unitNo, subject.unitNo)
    );
  }

  /** Trả true nếu được lưu tiếp; có hồ sơ nghi trùng thì hiện cảnh báo và dừng (backend vẫn kiểm lại khi lưu). */
  async function noSuspectedDuplicate(v: FormValues): Promise<boolean> {
    if (!v.street?.streetId || !trimmed(v.houseNo) || !addressChanged(v)) return true;
    setChecking(true);
    try {
      const found = await checkDuplicates({
        areaId: v.areaId!,
        streetId: v.street.streetId,
        houseNo: trimmed(v.houseNo),
        unitNo: trimmed(v.unitNo),
        excludeSubjectId: subject?.id,
      });
      if (found.length === 0) return true;
      setDupes(found);
      return false;
    } catch {
      return true; // không kiểm được thì để backend chặn khi lưu
    } finally {
      setChecking(false);
    }
  }

  async function finish(v: FormValues) {
    if (!(await noSuspectedDuplicate(v))) return;
    submitWith(v);
  }

  async function submitAsDifferentHousehold() {
    submitWith(await form.validateFields(), reason.trim());
  }

  function submitWith(v: FormValues, duplicateReason?: string) {
    const subjectReq = buildSubject(v, duplicateReason);
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
    <Form<FormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      disabled={submitting}
      initialValues={initialValues}
      onFinish={finish}
      onValuesChange={(changed: Partial<FormValues>) => {
        if ('areaId' in changed) {
          // Đường thuộc xã/phường khác tổ/ấp mới chọn thì bỏ chọn (backend cũng từ chối).
          const newDistrict = areas.find((a) => a.id === changed.areaId)?.districtId;
          const picked = form.getFieldValue('street') as StreetValue | undefined;
          if (picked?.districtId !== undefined && picked.districtId !== newDistrict) form.setFieldValue('street', undefined);
        }
        if ('areaId' in changed || 'street' in changed || 'houseNo' in changed || 'unitNo' in changed) {
          setDupes(null);
          setDistinct(false);
        }
      }}
    >
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
          <Form.Item label="Tổ/Ấp/Thôn" name="areaId" rules={[{ required: true, message: 'Vui lòng chọn tổ/ấp/thôn' }]}>
            <Select
              aria-label="Tổ/Ấp/Thôn"
              showSearch
              optionFilterProp="label"
              placeholder="Chọn tổ/ấp/thôn"
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
      <Form.Item
        label="Đường / hẻm"
        name="street"
        rules={[
          {
            validator: (_, v: StreetValue | undefined) =>
              v && (v.streetId || v.street.trim())
                ? Promise.resolve()
                : Promise.reject(new Error('Vui lòng chọn đường trong danh mục hoặc ghi nhận chờ xác minh')),
          },
        ]}
      >
        <StreetSearch districtId={districtId} />
      </Form.Item>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="Số nhà" name="houseNo" extra="VD: 12A, 12/5, 12/5B. Bỏ trống nếu nhà chưa có số.">
            <Input maxLength={30} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Phòng / căn" name="unitNo" extra="Khi nhiều hộ chung địa chỉ.">
            <Input maxLength={30} />
          </Form.Item>
        </Col>
        <Col xs={24} md={10}>
          <Form.Item label="Vị trí bổ sung" name="locationNote" extra="VD: đối diện chợ, cạnh trường.">
            <Input maxLength={255} />
          </Form.Item>
        </Col>
      </Row>
      {dupes && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Địa chỉ này có thể trùng hồ sơ đã có"
          description={
            <>
              <List<DuplicateSubject>
                size="small"
                dataSource={dupes}
                renderItem={(d) => (
                  <List.Item
                    actions={
                      onOpenExisting
                        ? [
                            <Button key="open" size="small" onClick={() => onOpenExisting(d.id)}>
                              Mở hồ sơ đã có
                            </Button>,
                          ]
                        : []
                    }
                  >
                    <Space wrap>
                      <Typography.Text strong>{d.code}</Typography.Text>
                      <Tag color={SUBJECT_STATUS_COLORS[d.status]}>{SUBJECT_STATUS_LABELS[d.status]}</Tag>
                      <span>{d.name}</span>
                      <span>{d.phone ?? 'Chưa có SĐT'}</span>
                      <Typography.Text type="secondary">{d.address}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
              {distinct ? (
                <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                  <Input.TextArea
                    aria-label="Lý do là hộ khác"
                    rows={2}
                    maxLength={500}
                    placeholder="Lý do (VD: hai hộ thuê chung nhà)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button type="primary" disabled={!reason.trim()} loading={submitting} onClick={() => void submitAsDifferentHousehold()}>
                    Lưu với lý do này
                  </Button>
                </Space>
              ) : (
                <Button style={{ marginTop: 8 }} onClick={() => setDistinct(true)}>
                  Xác nhận là hộ khác
                </Button>
              )}
            </>
          }
        />
      )}
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
            <Form.Item label="Số thành viên" name="memberCount" rules={[{ required: true, message: 'Vui lòng nhập số thành viên' }]}>
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
            <Form.Item
              label="Nhóm giá"
              name="tariffGroup"
              dependencies={['type', 'memberCount', 'validTo']}
              rules={[{ required: true, message: 'Vui lòng chọn nhóm giá' }, groupFitsMembers]}
            >
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
        <Button type="primary" htmlType="submit" loading={submitting || checking}>
          {subject ? 'Lưu hồ sơ' : 'Tạo hồ sơ'}
        </Button>
        {onCancel && <Button onClick={onCancel}>Hủy</Button>}
      </Space>
    </Form>
  );
}
