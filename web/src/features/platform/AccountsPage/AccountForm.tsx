import { Alert, Form, Input, Modal, Select } from 'antd';

import type { Role } from '../../../app/auth/authContext';
import { ROLE_LABELS } from '../../../app/layout/menuConfig';
import type { Company } from '../../masterdata/api';
import type { Account, CreateAccountRequest } from '../api';

const COMPANY_ROLES: Role[] = ['COMPANY_MANAGER', 'COLLECTOR'];

interface FormValues {
  username?: string;
  fullName?: string;
  role?: Role;
  companyId?: number;
  phone?: string;
  email?: string;
  organization?: string;
  password?: string;
}

interface Props {
  /** null = tạo mới; có tài khoản = sửa (không đổi tên đăng nhập, không nhập mật khẩu). */
  account: Account | null;
  open: boolean;
  companies: Company[];
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: CreateAccountRequest) => void;
  onCancel: () => void;
}

/** Popup thêm / sửa tài khoản: vai trò công ty và người đi thu bắt buộc chọn công ty. */
export function AccountForm({ account, open, companies, submitting, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const role = Form.useWatch('role', form);
  const creating = account === null;

  function finish(v: FormValues) {
    onSubmit({
      username: v.username?.trim() ?? account!.username,
      fullName: v.fullName!.trim(),
      role: v.role!,
      companyId: v.role && COMPANY_ROLES.includes(v.role) ? v.companyId : undefined,
      phone: v.phone?.trim() || undefined,
      email: v.email?.trim() || undefined,
      organization: v.organization?.trim() || undefined,
      password: v.password ?? '',
    });
  }

  return (
    <Modal
      title={creating ? 'Thêm tài khoản' : `Sửa tài khoản ${account.username}`}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={creating ? 'Tạo tài khoản' : 'Lưu thay đổi'}
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        initialValues={account ? { ...account, companyId: account.companyId ?? undefined } : { role: 'COLLECTOR' }}
        onFinish={finish}
      >
        {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
        {creating && (
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[
              { required: true, message: 'Vui lòng nhập tên đăng nhập' },
              { pattern: /^[A-Za-z0-9._]{3,50}$/, message: '3–50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới' },
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>
        )}
        <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label="Vai trò" name="role" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
          <Select
            aria-label="Vai trò"
            options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          />
        </Form.Item>
        {role && COMPANY_ROLES.includes(role) && (
          <Form.Item label="Công ty" name="companyId" rules={[{ required: true, message: 'Vui lòng chọn công ty' }]}>
            <Select
              aria-label="Công ty"
              placeholder="Chọn công ty"
              showSearch
              optionFilterProp="label"
              options={companies.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
            />
          </Form.Item>
        )}
        <Form.Item label="Điện thoại" name="phone" rules={[{ pattern: /^[0-9]{9,15}$/, message: 'Chỉ gồm 9–15 chữ số' }]}>
          <Input inputMode="numeric" />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Email không đúng định dạng' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label="Đơn vị công tác" name="organization">
          <Input maxLength={100} />
        </Form.Item>
        {creating && (
          <Form.Item
            label="Mật khẩu ban đầu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 8, max: 72, message: 'Từ 8 đến 72 ký tự' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
