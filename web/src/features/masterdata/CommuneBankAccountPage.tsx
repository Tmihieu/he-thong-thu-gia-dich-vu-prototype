import { Alert, App, Button, Form, Input, Spin, Typography } from 'antd';

import { errorTextOrNull } from '../../shared/errorText';
import { type CommuneBankAccount, useCommuneBankAccount, useSaveCommuneBankAccount } from './api';

const required = [{ required: true, whitespace: true, message: 'Vui lòng nhập' }];

/** Khai báo tài khoản nhận chuyển khoản của xã (UC-54): dùng cho mã VietQR và đối chiếu giao dịch SePay. */
export function CommuneBankAccountPage() {
  const { message } = App.useApp();
  const account = useCommuneBankAccount();
  const save = useSaveCommuneBankAccount();
  if (account.isLoading) return <Spin />;

  return (
    <>
      <Typography.Paragraph type="secondary">
        Mọi khoản chuyển khoản của hộ vào tài khoản chung này. Hệ thống dùng nó để tạo mã VietQR cho từng khoản phải thu và để đối chiếu giao dịch
        ngân hàng báo về.
      </Typography.Paragraph>
      {account.error && <Alert type="error" showIcon message={errorTextOrNull(account.error, 'Không tải được tài khoản của xã.')} role="alert" style={{ marginBottom: 16 }} />}
      {account.data === null && (
        <Alert type="warning" showIcon message="Xã chưa khai tài khoản nhận chuyển khoản" style={{ marginBottom: 16 }} />
      )}
      {save.error && <Alert type="error" showIcon message={errorTextOrNull(save.error, 'Không lưu được. Vui lòng thử lại.')} role="alert" style={{ marginBottom: 16 }} />}
      <Form<CommuneBankAccount>
        layout="vertical"
        requiredMark={false}
        style={{ maxWidth: 480 }}
        initialValues={account.data ?? undefined}
        onFinish={(v) =>
          save.mutate(
            { bankName: v.bankName.trim(), accountNumber: v.accountNumber.trim(), accountHolder: v.accountHolder.trim() },
            { onSuccess: () => void message.success('Đã lưu tài khoản nhận chuyển khoản') },
          )
        }
      >
        <Form.Item label="Ngân hàng" name="bankName" rules={required}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label="Số tài khoản" name="accountNumber" rules={required}>
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item label="Tên chủ tài khoản" name="accountHolder" rules={required}>
          <Input maxLength={150} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={save.isPending}>
          Lưu
        </Button>
      </Form>
    </>
  );
}
