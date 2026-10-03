import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { errorTextOrNull } from '../../../shared/errorText';
import { StatusTag } from '../../../shared/StatusTag';
import { PageHeader } from '../../../shared/PageHeader';
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
import { RolesTab } from './RolesTab';

/** Tài khoản & phân quyền (T51, quản trị): tạo, sửa vai trò/công ty, khóa/mở khóa, đặt lại mật khẩu; ma trận vai trò & phạm vi. */
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
      <PageHeader
        title="Tài khoản"
        description="Cấp, khóa tài khoản và phân vai trò cho cán bộ, công ty, người đi thu."
        extra={
          <Button type="primary" onClick={() => openForm(null)}>
            + Thêm tài khoản
          </Button>
        }
      />
      <Tabs
        items={[
          {
            key: 'accounts',
            label: 'Tài khoản',
            children: (
              <>
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
              scroll={{ x: 'max-content' }}
              dataSource={rows}
              pagination={{ pageSize: 20, hideOnSinglePage: true }}
              locale={{ emptyText: errorTextOrNull(accounts.error) ?? 'Không có tài khoản phù hợp' }}
              columns={[
                {
                  title: 'Người dùng',
                  className: 'cell-nowrap',
                  render: (_, a) => (
                    <>
                      <div>{a.fullName}</div>
                      <Typography.Text type="secondary">{a.username}</Typography.Text>
                    </>
                  ),
                },
                { title: 'Vai trò', className: 'cell-nowrap', render: (_, a) => <StatusTag color="blue">{ROLE_LABELS[a.role]}</StatusTag> },
                {
                  title: 'Công ty / đơn vị',
                  render: (_, a) => (a.companyId ? companyName.get(a.companyId) : a.organization) ?? '—',
                },
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
                          <Button size="small" type="link" danger={a.status === 'ACTIVE'}>
                            {a.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                          </Button>
                        </Popconfirm>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
              </>
            ),
          },
          { key: 'roles', label: 'Vai trò & phạm vi dữ liệu', children: <RolesTab /> },
        ]}
      />
      <AccountForm
        open={editing !== undefined}
        account={editing ?? null}
        isSelf={!!editing && editing.id === me?.id}
        companies={companies.data ?? []}
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
              { onSuccess: (a) => { message.success(`Đã đặt lại mật khẩu ${a.username}`); setResetting(null); } },
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

