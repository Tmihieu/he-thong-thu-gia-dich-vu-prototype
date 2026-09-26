import { Alert, Button, List, Segmented, Space, Switch, Tag, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../api/client';
import { useAuth } from '../../app/auth/authContext';
import { formatDate } from '../../shared/format';
import { type Notification, type NotificationKind, useMarkAllRead, useMarkRead, useNotifications } from './api';
import { NOTIFICATION_KIND_COLORS, NOTIFICATION_KIND_LABELS } from './labels';
import { notificationPath } from './links';
import { useOpenNotification } from './useOpenNotification';

const PAGE_SIZE = 20;

/** Trung tâm thông báo: lọc theo loại / chưa đọc, đánh dấu đã đọc, bấm để đi tới màn liên quan. */
export function NotificationCenterPage() {
  const { user } = useAuth();
  const [kind, setKind] = useState<NotificationKind | 'ALL'>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const list = useNotifications({ kind: kind === 'ALL' ? undefined : kind, unreadOnly, page, size: PAGE_SIZE });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const openNotification = useOpenNotification(user!.role);

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Thông báo
      </Typography.Title>
      <Space wrap style={{ marginBottom: 16 }}>
        <Segmented<NotificationKind | 'ALL'>
          value={kind}
          onChange={(v) => {
            setKind(v);
            setPage(0);
          }}
          options={[
            { value: 'ALL', label: 'Tất cả' },
            ...(Object.keys(NOTIFICATION_KIND_LABELS) as NotificationKind[]).map((k) => ({ value: k, label: NOTIFICATION_KIND_LABELS[k] })),
          ]}
        />
        <Space>
          <Switch
            checked={unreadOnly}
            onChange={(v) => {
              setUnreadOnly(v);
              setPage(0);
            }}
            aria-label="Chỉ chưa đọc"
          />
          Chỉ chưa đọc
        </Space>
        <Button onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={(list.data?.unreadCount ?? 0) === 0}>
          Đánh dấu tất cả đã đọc
        </Button>
      </Space>
      {list.error && (
        <Alert type="error" showIcon message={list.error instanceof ApiError ? list.error.message : 'Không tải được thông báo'} />
      )}
      <List<Notification>
        loading={list.isLoading}
        dataSource={list.data?.items ?? []}
        rowKey="id"
        locale={{ emptyText: 'Không có thông báo' }}
        pagination={{
          current: page + 1,
          pageSize: PAGE_SIZE,
          total: list.data?.total ?? 0,
          hideOnSinglePage: true,
          onChange: (p) => setPage(p - 1),
        }}
        renderItem={(n) => {
          const path = notificationPath(user!.role, n.link);
          return (
            <List.Item
              aria-label={n.title}
              actions={[
                path ? (
                  <Button key="open" type="link" size="small" onClick={() => openNotification(n)}>
                    Mở
                  </Button>
                ) : null,
                !n.readAt ? (
                  <Button key="read" size="small" onClick={() => markRead.mutate(n.id)}>
                    Đã đọc
                  </Button>
                ) : null,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={
                  <Space size={6} wrap>
                    <Tag color={NOTIFICATION_KIND_COLORS[n.kind]}>{NOTIFICATION_KIND_LABELS[n.kind]}</Tag>
                    <Typography.Text strong={!n.readAt}>{n.title}</Typography.Text>
                  </Space>
                }
                description={
                  <>
                    <div style={{ whiteSpace: 'pre-line' }}>{n.body}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(n.createdAt, true)}
                      {n.readAt ? ' · đã đọc' : ''}
                    </Typography.Text>
                  </>
                }
              />
            </List.Item>
          );
        }}
      />
    </>
  );
}
