import { App, Button, Form, Input, Modal, Popconfirm, Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { DateText } from '../../../shared/DateText';
import { errorTextOrNull } from '../../../shared/errorText';
import { PageHeader } from '../../../shared/PageHeader';
import { StatusTag } from '../../../shared/StatusTag';
import {
  type Account,
  useCollectorAccounts,
  useCreateCollectorAccount,
  useResetCollectorPassword,
  useSetCollectorAccountLocked,
  useUpdateCollectorAccount,
} from '../../platform/api';
import { CollectorAccountForm } from './CollectorAccountForm';

/** "Người đi thu": công ty tự cấp, sửa, khóa tài khoản và đặt lại mật khẩu người đi thu của mình (BR-PLT-08). */
export function CollectorAccountsPage() {
  const { message } = App.useApp();
  const accounts = useCollectorAccounts();
  const create = useCreateCollectorAccount();
  const update = useUpdateCollectorAccount();
  const setLocked = useSetCollectorAccountLocked();
  const reset = useResetCollectorPassword();

  const [editing, setEditing] = useState<Account | null | undefined>(undefined);
  const [resetting, setResetting] = useState<Account | null>(null);
  const [pwForm] = Form.useForm<{ password: string }>();
  const saving = editing === null ? create : update;

  function openForm(account: Account | null) {
    create.reset();
    update.reset();
    setEditing(account);
  }

  return (
    <>
      <PageHeader
        title="Người đi thu"
        description="Cấp, khóa tài khoản và đặt lại mật khẩu người đi thu của công ty."
        extra={
          <Button type="primary" onClick={() => openForm(null)}>
            + Thêm người đi thu
          </Button>
        }
      />
      <Table<Account>
        rowKey="id"
        loading={accounts.isLoading}
        scroll={{ x: 'max-content' }}
        dataSource={accounts.data ?? []}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: errorTextOrNull(accounts.error) ?? 'Công ty chưa có tài khoản người đi thu' }}
        columns={[
          {
            title: 'Người đi thu',
            className: 'cell-nowrap',
            render: (_, a) => (
              <>
                <div>{a.fullName}</div>
                <Typography.Text type="secondary">{a.username}</Typography.Text>
              </>
            ),
          },
          { title: 'Điện thoại', render: (_, a) => a.phone ?? '—' },
          {
            title: 'Đăng nhập gần nhất',
            className: 'cell-nowrap',
            render: (_, a) => (a.lastLoginAt ? <DateText value={a.lastLoginAt} withTime /> : 'Chưa đăng nhập'),
          },
          {
            title: 'Trạng thái',
            render: (_, a) => (a.status === 'ACTIVE' ? <StatusTag color="green">Hoạt động</StatusTag> : <StatusTag>Đã khóa</StatusTag>),
          },
          {
            title: '',
            render: (_, a) => (
              <Space size="small">
                <Button size="small" type="link" onClick={() => openForm(a)} aria-label={`Sửa ${a.username}`}>
                  Sửa
                </Button>
                <Button
                  size="small"
                  type="link"
                  aria-label={`Đặt lại mật khẩu ${a.username}`}
                  onClick={() => {
                    reset.reset();
                    setResetting(a);
                  }}
                >
                  Đặt lại mật khẩu
                </Button>
                <Popconfirm
                  title={a.status === 'ACTIVE' ? `Khóa ${a.username}?` : `Mở khóa ${a.username}?`}
                  description={a.status === 'ACTIVE' ? 'Không đăng nhập lại được; phiên đang mở còn hiệu lực đến khi hết hạn.' : undefined}
                  okText={a.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                  cancelText="Hủy"
                  onConfirm={() =>
                    setLocked.mutate(
                      { id: a.id, locked: a.status === 'ACTIVE' },
                      {
                        onSuccess: (r) => message.success(`${r.status === 'LOCKED' ? 'Đã khóa' : 'Đã mở khóa'} ${r.username}`),
                        onError: (e) => message.error(errorTextOrNull(e)),
                      },
                    )
                  }
                >
                  <Button size="small" type="link" danger={a.status === 'ACTIVE'} aria-label={`${a.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'} ${a.username}`}>
                    {a.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <CollectorAccountForm
        open={editing !== undefined}
        account={editing ?? null}
        submitting={saving.isPending}
        error={errorTextOrNull(saving.error)}
        onCancel={() => setEditing(undefined)}
        onSubmit={({ username, password, ...body }) => {
          const onSuccess = (a: Account) => {
            message.success(editing ? `Đã lưu ${a.username}` : `Đã tạo tài khoản ${a.username}`);
            setEditing(undefined);
          };
          if (editing) update.mutate({ id: editing.id, body }, { onSuccess });
          else create.mutate({ username, password, ...body }, { onSuccess });
        }}
      />
      <Modal
        title={resetting ? `Đặt lại mật khẩu ${resetting.username}` : ''}
        open={resetting !== null}
        onCancel={() => setResetting(null)}
        onOk={() => pwForm.submit()}
        okText="Đặt lại"
        cancelText="Hủy"
        confirmLoading={reset.isPending}
        destroyOnHidden
      >
        <Form
          form={pwForm}
          layout="vertical"
          requiredMark={false}
          preserve={false}
          onFinish={({ password }) =>
            reset.mutate(
              { id: resetting!.id, password },
              {
                onSuccess: (a) => {
                  message.success(`Đã đặt lại mật khẩu ${a.username}`);
                  setResetting(null);
                },
              },
            )
          }
        >
          {reset.error && (
            <Typography.Paragraph type="danger" role="alert">
              {errorTextOrNull(reset.error)}
            </Typography.Paragraph>
          )}
          <Form.Item
            label="Mật khẩu mới"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 8, max: 72, message: 'Từ 8 đến 72 ký tự' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
