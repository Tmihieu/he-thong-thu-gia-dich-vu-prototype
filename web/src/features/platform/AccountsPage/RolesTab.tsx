import { Alert, Button, Checkbox, Form, Modal, Select, Table } from 'antd';
import { useState } from 'react';

import type { Role } from '../../../app/auth/authContext';
import { StatusTag } from '../../../shared/StatusTag';
import { MENU, ROLE_LABELS } from '../../../app/layout/menuConfig';

const SCOPES = ['Toàn xã', 'Toàn xã (chỉ xem)', 'Đúng một công ty', 'Mọi hộ của công ty', 'Hệ thống'] as const;
const RIGHTS = ['Xem', 'Tạo/cập nhật', 'Xuất dữ liệu', 'Duyệt/khóa sổ', 'Duyệt miễn giảm / hoàn / xóa nợ'] as const;

interface RoleRow {
  role: Role;
  scope: string;
  functions: string[];
  rights: string[];
}

const INITIAL: RoleRow[] = (
  [
    ['COMMUNE_OFFICER', 'Toàn xã', ['Xem', 'Tạo/cập nhật', 'Xuất dữ liệu', 'Duyệt/khóa sổ']],
    ['COMPANY_MANAGER', 'Đúng một công ty', ['Xem', 'Tạo/cập nhật', 'Xuất dữ liệu']],
    ['COLLECTOR', 'Mọi hộ của công ty', ['Xem', 'Tạo/cập nhật']],
    ['ADMIN', 'Hệ thống', ['Xem', 'Tạo/cập nhật']],
    ['LEADER', 'Toàn xã (chỉ xem)', ['Xem', 'Xuất dữ liệu', 'Duyệt miễn giảm / hoàn / xóa nợ']],
  ] as const
).map(([role, scope, rights]) => ({ role, scope, functions: MENU[role].map((m) => m.label), rights: [...rights] }));

/**
 * Ma trận vai trò – phạm vi dữ liệu – chức năng – quyền. Quyền thật kiểm ở API theo vai trò;
 * nút Sửa hiện chỉ lưu trên màn hình (mô phỏng), chưa ghi về máy chủ.
 */
export function RolesTab() {
  const [rows, setRows] = useState(INITIAL);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [form] = Form.useForm<Omit<RoleRow, 'role'>>();

  return (
    <>
      <Table<RoleRow>
        rowKey="role"
        pagination={false}
        dataSource={rows}
        columns={[
          { title: 'Vai trò', render: (_, r) => <StatusTag color="blue">{ROLE_LABELS[r.role]}</StatusTag> },
          { title: 'Phạm vi', dataIndex: 'scope', render: (s: string) => <strong>{s}</strong> },
          { title: 'Chức năng', render: (_, r) => r.functions.join(', ') },
          { title: 'Quyền', render: (_, r) => r.rights.map((x) => <StatusTag key={x}>{x}</StatusTag>) },
          {
            title: '',
            render: (_, r) => (
              <Button size="small" onClick={() => setEditing(r)} aria-label={`Sửa quyền ${ROLE_LABELS[r.role]}`}>
                Sửa
              </Button>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? `Sửa quyền · ${ROLE_LABELS[editing.role]}` : ''}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
      >
        {editing && (
          <Form
            form={form}
            layout="vertical"
            preserve={false}
            initialValues={editing}
            onFinish={(v) => {
              setRows((prev) => prev.map((r) => (r.role === editing.role ? { ...r, ...v } : r)));
              setEditing(null);
            }}
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Bản mô phỏng: thay đổi chỉ hiện trên màn hình, quyền thật vẫn kiểm ở máy chủ theo vai trò."
            />
            <Form.Item label="Phạm vi dữ liệu" name="scope">
              <Select options={SCOPES.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item label="Chức năng" name="functions">
              <Checkbox.Group options={MENU[editing.role].map((m) => m.label)} />
            </Form.Item>
            <Form.Item label="Quyền" name="rights">
              <Checkbox.Group options={[...RIGHTS]} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}
