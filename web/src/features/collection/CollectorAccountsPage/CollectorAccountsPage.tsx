import { Table, Typography } from 'antd';

import { DateText } from '../../../shared/DateText';
import { errorTextOrNull } from '../../../shared/errorText';
import { PageHeader } from '../../../shared/PageHeader';
import { StatusTag } from '../../../shared/StatusTag';
import { type Account, useCollectorAccounts } from '../../platform/api';

/** "Người đi thu": công ty chỉ xem danh sách người đi thu của mình; quản trị viên tạo, sửa, khóa và đặt lại mật khẩu (UC-04). */
export function CollectorAccountsPage() {
  const accounts = useCollectorAccounts();

  return (
    <>
      <PageHeader title="Người đi thu" description="Danh sách người đi thu của công ty. Cần thêm hoặc sửa tài khoản thì liên hệ quản trị viên." />
      <Table<Account>
        rowKey="id"
        loading={accounts.isLoading}
        scroll={{ x: 'max-content' }}
        dataSource={accounts.data ?? []}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: errorTextOrNull(accounts.error) ?? 'Công ty chưa có tài khoản người đi thu. Liên hệ quản trị viên để cấp.' }}
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
        ]}
      />
    </>
  );
}
