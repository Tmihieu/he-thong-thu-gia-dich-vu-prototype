import { Alert, DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { COMPANY_TYPE_LABELS } from '../../../shared/labels';
import type { Company, CompanyRequest } from '../api';

type Text = Omit<CompanyRequest, 'validFrom' | 'validTo'>;
type FormValues = { [K in keyof Text]?: Text[K] | null } & { validFrom?: Dayjs; validTo?: Dayjs | null };

interface Props {
  /** null = thêm mới. */
  company: Company | null;
  open: boolean;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: CompanyRequest) => void;
  onCancel: () => void;
}

const optional = (s?: string | null) => s?.trim() || undefined;

/** Popup thêm / sửa công ty môi trường; mã DVnn do hệ thống cấp. */
export function CompanyFormModal({ company, open, submitting, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();

  function finish(v: FormValues) {
    onSubmit({
      name: v.name!.trim(),
      contactName: v.contactName!.trim(),
      contactPhone: v.contactPhone!.trim(),
      status: v.status ?? undefined,
      validFrom: v.validFrom!.format('YYYY-MM-DD'),
      validTo: v.validTo ? v.validTo.format('YYYY-MM-DD') : undefined,
      orgType: v.orgType ?? undefined,
      taxCode: optional(v.taxCode),
      address: optional(v.address),
      email: optional(v.email),
      communeContractNo: optional(v.communeContractNo),
      bankAccount: optional(v.bankAccount),
      bankName: optional(v.bankName),
    });
  }

  const initial: FormValues = company
    ? { ...company, validFrom: dayjs(company.validFrom), validTo: company.validTo ? dayjs(company.validTo) : null }
    : { status: 'ACTIVE' };

  return (
    <Modal
      title={company ? `Sửa ${company.code} · ${company.name}` : 'Thêm công ty'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={company ? 'Lưu thay đổi' : 'Thêm công ty'}
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
      width={640}
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} preserve={false} initialValues={initial} onFinish={finish}>
        {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
        <Form.Item label="Tên công ty" name="name" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên công ty' }]}>
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item label="Người đầu mối" name="contactName" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập người đầu mối' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item
          label="SĐT đầu mối"
          name="contactPhone"
          rules={[
            { required: true, message: 'Vui lòng nhập số điện thoại' },
            { pattern: /^[0-9]{9,15}$/, message: 'Chỉ gồm 9–15 chữ số' },
          ]}
        >
          <Input inputMode="numeric" />
        </Form.Item>
        <Form.Item label="Hiệu lực từ" name="validFrom" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
          <DatePicker format="DD/MM/YYYY" placeholder="dd/mm/yyyy" />
        </Form.Item>
        <Form.Item
          label="Hiệu lực đến"
          name="validTo"
          dependencies={['validFrom']}
          extra="Để trống = chưa xác định"
          rules={[
            ({ getFieldValue }) => ({
              validator: (_, v: Dayjs | null) =>
                !v || !getFieldValue('validFrom') || !v.isBefore(getFieldValue('validFrom'), 'day')
                  ? Promise.resolve()
                  : Promise.reject(new Error('Không được trước hiệu lực từ')),
            }),
          ]}
        >
          <DatePicker format="DD/MM/YYYY" placeholder="dd/mm/yyyy" />
        </Form.Item>
        <Form.Item label="Trạng thái" name="status">
          <Select
            aria-label="Trạng thái"
            options={[
              { value: 'ACTIVE', label: 'Đang hợp tác' },
              { value: 'INACTIVE', label: 'Ngừng hợp tác' },
            ]}
          />
        </Form.Item>
        <Form.Item label="Loại hình" name="orgType">
          <Select
            aria-label="Loại hình"
            allowClear
            options={Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Form.Item>
        <Form.Item label="Mã số thuế" name="taxCode" rules={[{ pattern: /^[0-9-]{10,14}$/, message: '10–14 chữ số' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Địa chỉ" name="address">
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Email không đúng định dạng' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label="Số hợp đồng với xã" name="communeContractNo">
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item label="Tài khoản ngân hàng" name="bankAccount">
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item label="Ngân hàng" name="bankName">
          <Input maxLength={100} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
