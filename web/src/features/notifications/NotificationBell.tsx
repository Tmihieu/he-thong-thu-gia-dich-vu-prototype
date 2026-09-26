import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Empty, List, Popover, Spin, Typography } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router';

import type { Role } from '../../app/auth/authContext';
import { ROLE_BASE } from '../../app/layout/menuConfig';
import { formatDate } from '../../shared/format';
import { type Notification, useNotifications, useUnreadCount } from './api';
import { useOpenNotification } from './useOpenNotification';

function Item({ n, onOpen }: { n: Notification; onOpen: (n: Notification) => void }) {
  return (
    <List.Item
      onClick={() => onOpen(n)}
      style={{ cursor: 'pointer', paddingInline: 8, background: n.readAt ? undefined : 'rgba(22, 119, 255, 0.06)' }}
    >
      <List.Item.Meta
        title={<Typography.Text strong={!n.readAt}>{n.title}</Typography.Text>}
        description={
          <>
            <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
              {n.body}
            </Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(n.createdAt, true)}
            </Typography.Text>
          </>
        }
      />
    </List.Item>
  );
}

/** Chuông trên header: số chưa đọc (kiểm tra 30 giây/lần), 5 thông báo mới nhất, link tới trung tâm thông báo. */
export function NotificationBell({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const latest = useNotifications({ page: 0, size: 5 }, open);
  const openNotification = useOpenNotification(role);
  const count = unread.data?.unreadCount ?? 0;

  const content = (
    <div style={{ width: 340, maxWidth: 'calc(100vw - 32px)' }}>
      {latest.isLoading ? (
        <Spin />
      ) : (latest.data?.items.length ?? 0) === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
      ) : (
        <List<Notification>
          size="small"
          dataSource={latest.data!.items}
          rowKey="id"
          renderItem={(n) => (
            <Item
              n={n}
              onOpen={(x) => {
                setOpen(false);
                openNotification(x);
              }}
            />
          )}
        />
      )}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Link to={`${ROLE_BASE[role]}/notifications`} onClick={() => setOpen(false)}>
          Xem tất cả thông báo
        </Link>
      </div>
    </div>
  );

  return (
    <Popover trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} content={content} title="Thông báo">
      <Badge count={count} size="small" overflowCount={99}>
        <Button type="text" icon={<BellOutlined />} aria-label={count > 0 ? `Thông báo, ${count} chưa đọc` : 'Thông báo'} />
      </Badge>
    </Popover>
  );
}
