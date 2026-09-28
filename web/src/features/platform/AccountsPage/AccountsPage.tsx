import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { ApiError } from '../../../api/client';
import { useAuth } from '../../../app/auth/authContext';
import type { Role } from '../../../app/auth/authContext';
import { ROLE_LABELS } from '../../../app/layout/menuConfig';
import { DateText } from '../../../shared/DateText';
import { normalizeText } from '../../../shared/normalizeText';
import { useCompanies } from '../../masterdata/api';
import {
  type Account,
  useAccounts,
  useCreateAccount,
  useResetPassword,
  useSetAccountLocked,
  useUpdateAccount,
} from '../api';
import { AccountForm } from './AccountForm';

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

/** Tài khoản & phân quyền (T51, quản trị): tạo, sửa vai trò/công ty, khóa/mở khóa, đặt lại mật khẩu. */
export function AccountsPage() {
  const { message } = App.useApp();
  const { user: me } = useAuth();
  const accounts = useAccounts();
  const companies = useCompanies();
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const setLocked = useSetAccountLocked();
  const reset = useResetPassword();

  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | undefined>();
  const [editing, setEditing] = useState<Account | null | undefined>(undefined);
  const [resetting, setResetting] = useState<Account | null>(null);
  const [pwForm] = Form.useForm<{ password: string }>();

  const companyName = useMemo(
    () => new Map((companies.data ?? []).map((c) => [c.id, `${c.code} · ${c.name}`])),
    [companies.data],
  );
  const rows = useMemo(() => {
    const needle = normalizeText(q);
    return (accounts.data ?? [])
      .filter((a) => !role || a.role === role)
      .filter((a) => !needle || normalizeText(`${a.username} ${a.fullName} ${a.organization ?? ''}`).includes(needle));
  }, [accounts.data, q, role]);

  const saving = editing === null ? create : update;

  function openForm(account: Account | null) {
    create.reset();
    update.reset();
    setEditing(account);
  }

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Tài khoản
        </Typography.Title>
        <Button type="primary" onClick={() => openForm(null)}>
          + Thêm tài khoản
        </Button>
      </Space>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Tên, tên đăng nhập, đơn vị" style={{ width: 280 }} onChange={(e) => setQ(e.target.value)} />
        <Select
          aria-label="Lọc vai trò"
          allowClear
          placeholder="Tất cả vai trò"
          style={{ width: 200 }}
          value={role}
          onChange={setRole}
          options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
        />
      </Space>
      <Table<Account>
        rowKey="id"
        loading={accounts.isLoading}
        dataSource={rows}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: errorMessage(accounts.error) ?? 'Không có tài khoản phù hợp' }}
        columns={[
          {
            title: 'Người dùng',
            render: (_, a) => (
              <>
                <div>{a.fullName}</div>
                <Typography.Text type="secondary">{a.username}</Typography.Text>
              </>
            ),
          },
          { title: 'Vai trò', render: (_, a) => <Tag color="blue">{ROLE_LABELS[a.role]}</Tag> },
          {
            title: 'Công ty / đơn vị',
            render: (_, a) => (a.companyId ? companyName.get(a.companyId) : a.organization) ?? '—',
          },
          {
            title: 'Đăng nhập gần nhất',
            render: (_, a) => (a.lastLoginAt ? <DateText value={a.lastLoginAt} withTime /> : 'Chưa đăng nhập'),
          },
          {
            title: 'Trạng thái',
            render: (_, a) => (a.status === 'ACTIVE' ? <Tag color="green">Hoạt động</Tag> : <Tag>Đã khóa</Tag>),
          },
          {
            title: '',
            render: (_, a) => (
              <Space size="small">
                <Button size="small" onClick={() => openForm(a)} aria-label={`Sửa ${a.username}`}>
                  Sửa
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    reset.reset();
                    setResetting(a);
                  }}
                >
                  Đặt lại mật khẩu
                </Button>
                {a.id !== me?.id && (
                  <Popconfirm
                    title={a.status === 'ACTIVE' ? `Khóa ${a.username}?` : `Mở khóa ${a.username}?`}
                    description={a.status === 'ACTIVE' ? 'Tài khoản sẽ không đăng nhập được nữa.' : undefined}
                    okText={a.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                    cancelText="Hủy"
                    onConfirm={() =>
                      setLocked.mutate(
                        { id: a.id, locked: a.status === 'ACTIVE' },
                        {
                          onSuccess: (r) => message.success(`${r.status === 'LOCKED' ? 'Đã khóa' : 'Đã mở khóa'} ${r.username}`),
                          onError: (e) => message.error(errorMessage(e)),
                        },
                      )
                    }
                  >
                    <Button size="small" danger={a.status === 'ACTIVE'}>
                      {a.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
      <AccountForm
        open={editing !== undefined}
        account={editing ?? null}
        companies={companies.data ?? []}
        submitting={saving.isPending}
        error={errorMessage(saving.error)}
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
              { onSuccess: (a) => { message.success(`Đã đặt lại mật khẩu ${a.username}`); setResetting(null); } },
            )
          }
        >
          {reset.error && (
            <Typography.Paragraph type="danger" role="alert">
              {errorMessage(reset.error)}
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

