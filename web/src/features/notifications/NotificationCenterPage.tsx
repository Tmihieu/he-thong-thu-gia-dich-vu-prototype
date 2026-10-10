import { BellOutlined, CommentOutlined, FileTextOutlined, InfoCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { Avatar, Badge, Button, List, Segmented, Space, Switch, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { useAuth } from '../../app/auth/authContext';
import { formatDate } from '../../shared/format';
import { PageHeader } from '../../shared/PageHeader';
import { EmptyBlock, ErrorBlock } from '../../shared/StateBlock';
import { StatusTag } from '../../shared/StatusTag';
import { type Notification, type NotificationKind, useMarkAllRead, useMarkRead, useNotifications } from './api';
import { NOTIFICATION_KIND_TONES, NOTIFICATION_KIND_LABELS } from './labels';
import { notificationPath } from './links';
import { useOpenNotification } from './useOpenNotification';

const PAGE_SIZE = 20;
const KIND_ICONS: Record<NotificationKind, ReactNode> = {
  REMINDER: <BellOutlined />,
  COMPLAINT: <CommentOutlined />,
  RECEIPT: <FileTextOutlined />,
  INFO: <InfoCircleOutlined />,
  TRANSACTION: <SwapOutlined />,
};

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
      <PageHeader
        title="Thông báo"
        description="Nhắc nộp, khiếu nại, phiếu quyết toán và giao dịch liên quan đến bạn; bấm Mở để đi tới màn xử lý."
        extra={
          <Button onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={(list.data?.unreadCount ?? 0) === 0}>
            Đánh dấu tất cả đã đọc
          </Button>
        }
      />
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
      </Space>
      {(markRead.error ?? markAll.error) && <ErrorBlock error={markRead.error ?? markAll.error} />}
      {list.error && <ErrorBlock error={list.error} onRetry={() => void list.refetch()} />}
      <List<Notification>
        loading={list.isLoading}
        dataSource={list.data?.items ?? []}
        rowKey="id"
        locale={{ emptyText: <EmptyBlock title="Không có thông báo" hint="Thông báo mới sẽ hiện ở đây và trên chuông góc trên." /> }}
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
                avatar={
                  <Badge dot={!n.readAt} offset={[-4, 4]}>
                    <Avatar shape="square" icon={KIND_ICONS[n.kind]} />
                  </Badge>
                }
                title={
                  <Space size={6} wrap>
                    <StatusTag tone={NOTIFICATION_KIND_TONES[n.kind]}>{NOTIFICATION_KIND_LABELS[n.kind]}</StatusTag>
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
