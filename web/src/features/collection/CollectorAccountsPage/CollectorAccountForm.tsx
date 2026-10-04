import { Alert, Form, Input, Modal } from 'antd';

import type { Account, CreateCollectorAccountRequest } from '../../platform/api';

interface FormValues {
  username?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
}

interface Props {
  /** null = tạo mới; có tài khoản = sửa (không đổi tên đăng nhập, không nhập mật khẩu). */
  account: Account | null;
  open: boolean;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (req: CreateCollectorAccountRequest) => void;
  onCancel: () => void;
}

/** Popup thêm / sửa người đi thu; vai trò và công ty do máy chủ gán, quản lý không chọn (BR-PLT-08). */
export function CollectorAccountForm({ account, open, submitting, error, onSubmit, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const creating = account === null;

  function finish(v: FormValues) {
    onSubmit({
      username: v.username?.trim() ?? account!.username,
      fullName: v.fullName!.trim(),
      phone: v.phone?.trim() || undefined,
      email: v.email?.trim() || undefined,
      password: v.password ?? '',
    });
  }

  return (
    <Modal
      title={creating ? 'Thêm người đi thu' : `Sửa người đi thu ${account.username}`}
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
        initialValues={account ? { fullName: account.fullName, phone: account.phone ?? undefined, email: account.email ?? undefined } : {}}
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
        <Form.Item label="Điện thoại" name="phone" rules={[{ pattern: /^[0-9]{9,15}$/, message: 'Chỉ gồm 9–15 chữ số' }]}>
          <Input inputMode="numeric" />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Email không đúng định dạng' }]}>
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
