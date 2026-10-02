import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Descriptions,
  Form,
  Image,
  Input,
  List,
  Modal,
  Popconfirm,
  Result,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { api, ApiError } from '../../api/client';
import type { components } from '../../api/schema';
import { AuthImage } from '../../shared/AuthImage';
import { DateText } from '../../shared/DateText';
import { errorText } from '../../shared/errorText';
import { MARKET_CATEGORY_LABELS, MARKET_STATUS_LABELS, MARKET_TAG_LABELS } from '../../shared/labels';
import { PageHeader } from '../../shared/PageHeader';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../shared/StateBlock';
import { StatusTag } from '../../shared/StatusTag';

type Schemas = components['schemas'];
type AdminPost = Schemas['MarketAdminPostDto'];
type Moderation = AdminPost['moderation'];
type ReportReason = Schemas['MarketReportDto']['reason'];

const PAGE_SIZE = 20;

const MODERATION_LABELS: Record<Moderation, string> = {
  PUBLISHED: 'Đang hiển thị',
  PENDING_REVIEW: 'Chờ duyệt',
  REJECTED: 'Đã gỡ',
};
const MODERATION_COLORS: Record<Moderation, string> = {
  PUBLISHED: 'green',
  PENDING_REVIEW: 'orange',
  REJECTED: 'red',
};
const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: 'Spam, đăng lặp',
  PROHIBITED: 'Hàng cấm',
  SCAM: 'Nghi lừa đảo',
  OFFENSIVE: 'Nội dung xúc phạm',
  OTHER: 'Lý do khác',
};

const marketKeys = {
  all: ['market-moderation'] as const,
  summary: ['market-moderation', 'summary'] as const,
  keywords: ['market-moderation', 'keywords'] as const,
};

function title(caption: string) {
  return caption.split('\n')[0] ?? caption;
}

function ModerationTag({ post }: { post: AdminPost }) {
  return <Tag color={MODERATION_COLORS[post.moderation]}>{MODERATION_LABELS[post.moderation]}</Tag>;
}

type TabKey = 'pending' | 'reported' | 'all' | 'rejected' | 'keywords';
const TAB_FILTERS: Record<Exclude<TabKey, 'keywords'>, { moderation?: Moderation; reported?: boolean }> = {
  pending: { moderation: 'PENDING_REVIEW' },
  reported: { reported: true },
  all: {},
  rejected: { moderation: 'REJECTED' },
};

/**
 * "Chợ cộng đồng" của cán bộ xã: không đăng hay bình luận, chỉ quản lý danh sách bài — duyệt bài bị bộ lọc từ khóa
 * giữ lại hoặc bị người dân báo cáo, gỡ bài vi phạm (bắt buộc lý do) và quản lý từ khóa lọc.
 */
export function MarketModerationPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabKey | null) ?? 'pending';
  const summary = useQuery({
    queryKey: marketKeys.summary,
    queryFn: () => api.get<Schemas['MarketModerationSummaryDto']>('/api/market-moderation/summary'),
  });
  const label = (text: string, count?: number) => (
    <Space size={6}>
      {text}
      {!!count && <Badge count={count} />}
    </Space>
  );

  return (
    <>
      <PageHeader title="Chợ cộng đồng" />
      <Typography.Paragraph type="secondary">
        Bài chứa từ khóa trong bộ lọc phải chờ duyệt mới hiển thị; bài bị từ 3 người báo cáo được tạm gỡ chờ xem lại.
      </Typography.Paragraph>
      <Tabs
        activeKey={tab}
        onChange={(key) => setParams({ tab: key }, { replace: true })}
        destroyOnHidden
        items={[
          { key: 'pending', label: label('Chờ duyệt', summary.data?.pendingReview), children: <PostTable tab="pending" /> },
          { key: 'reported', label: label('Bị báo cáo', summary.data?.reported), children: <PostTable tab="reported" /> },
          { key: 'all', label: 'Tất cả bài', children: <PostTable tab="all" /> },
          { key: 'rejected', label: 'Đã gỡ', children: <PostTable tab="rejected" /> },
          { key: 'keywords', label: 'Bộ lọc từ khóa', children: <KeywordPanel /> },
        ]}
      />
    </>
  );
}

function PostTable({ tab }: { tab: Exclude<TabKey, 'keywords'> }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const posts = useQuery({
    queryKey: [...marketKeys.all, 'posts', tab, q, page],
    queryFn: ({ signal }) =>
      api.get<Schemas['PageDtoMarketAdminPostDto']>('/api/market-moderation/posts', {
        params: { ...TAB_FILTERS[tab], q: q.trim(), page, size: PAGE_SIZE },
        signal,
      }),
    placeholderData: (prev) => prev,
  });

  if (posts.error) {
    return (
      <ErrorBlock error={posts.error} onRetry={() => void posts.refetch()} />
    );
  }
  return (
    <>
      <Input.Search
        allowClear
        placeholder="Tìm theo mã, nội dung, người đăng"
        maxLength={100}
        onSearch={(v) => {
          setQ(v);
          setPage(0);
        }}
        style={{ width: 320, marginBottom: 12 }}
      />
      <Table<AdminPost>
        rowKey="id"
        size="middle"
        loading={posts.isFetching}
        dataSource={posts.data?.items ?? []}
        locale={{ emptyText: <EmptyBlock title="Không có bài nào" /> }}
        pagination={{
          current: page + 1,
          pageSize: PAGE_SIZE,
          total: posts.data?.total ?? 0,
          showSizeChanger: false,
          onChange: (p) => setPage(p - 1),
        }}
        columns={[
          {
            title: 'Ảnh',
            key: 'photo',
            width: 72,
            render: (_, p) =>
              p.photoUrls[0] ? <AuthImage path={p.photoUrls[0]} alt={`Ảnh ${p.code}`} size={48} /> : null,
          },
          {
            title: 'Bài đăng',
            key: 'post',
            render: (_, p) => (
              <Space direction="vertical" size={2}>
                <Link to={String(p.id)}>{p.code}</Link>
                <Typography.Text ellipsis style={{ maxWidth: 360 }}>
                  {title(p.caption)}
                </Typography.Text>
              </Space>
            ),
          },
          {
            title: 'Người đăng',
            key: 'author',
            render: (_, p) => (
              <Space direction="vertical" size={2}>
                {p.author.displayName}
                <Typography.Text type="secondary">{p.area.name}</Typography.Text>
              </Space>
            ),
          },
          {
            title: 'Trạng thái',
            key: 'state',
            render: (_, p) => (
              <Space size={[4, 4]} wrap>
                <ModerationTag post={p} />
                {p.hidden && <Tag>Người đăng đã ẩn</Tag>}
                {p.status === 'CLOSED' && <Tag>{MARKET_STATUS_LABELS.CLOSED}</Tag>}
              </Space>
            ),
          },
          {
            title: 'Báo cáo',
            dataIndex: 'openReports',
            align: 'center',
            render: (n: number) => (n > 0 ? <Badge count={n} /> : '—'),
          },
          {
            title: 'Đăng lúc',
            dataIndex: 'createdAt',
            render: (v: string) => <DateText value={v} withTime />,
          },
        ]}
      />
    </>
  );
}

function KeywordPanel() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ keyword: string }>();
  const keywords = useQuery({
    queryKey: marketKeys.keywords,
    queryFn: () => api.get<Schemas['MarketKeywordDto'][]>('/api/market-moderation/keywords'),
  });
  const add = useMutation({
    mutationFn: (keyword: string) => api.post<Schemas['MarketKeywordDto']>('/api/market-moderation/keywords', { keyword }),
    onSuccess: (k) => {
      form.resetFields();
      message.success(`Đã thêm từ khóa "${k.keyword}"`);
      void queryClient.invalidateQueries({ queryKey: marketKeys.keywords });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/api/market-moderation/keywords/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: marketKeys.keywords }),
  });

  return (
    <Card>
      <Typography.Paragraph type="secondary">
        Bài mới hoặc bài sửa có chứa một trong các từ khóa dưới đây (không phân biệt hoa thường, khớp nguyên cụm từ)
        sẽ không hiển thị ngay mà chuyển sang "Chờ duyệt".
      </Typography.Paragraph>
      <Form form={form} layout="inline" onFinish={(v) => add.mutate(v.keyword)} style={{ marginBottom: 16 }}>
        <Form.Item name="keyword" rules={[{ required: true, whitespace: true, message: 'Nhập từ khóa' }]}>
          <Input placeholder="Từ khóa, ví dụ: pháo" maxLength={100} style={{ width: 260 }} aria-label="Từ khóa mới" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={add.isPending}>
          Thêm từ khóa
        </Button>
      </Form>
      {add.error && <Alert type="error" showIcon message={errorText(add.error)} style={{ marginBottom: 12 }} />}
      {keywords.error ? (
        <ErrorBlock error={keywords.error} onRetry={() => void keywords.refetch()} />
      ) : keywords.isLoading ? (
        <LoadingBlock rows={2} />
      ) : keywords.data!.length === 0 ? (
        <EmptyBlock title="Chưa có từ khóa lọc" />
      ) : (
        <Space size={[8, 8]} wrap>
          {keywords.data!.map((k) => (
            <Tag
              key={k.id}
              closable
              onClose={(e) => {
                e.preventDefault();
                remove.mutate(k.id);
              }}
            >
              {k.keyword}
            </Tag>
          ))}
        </Space>
      )}
    </Card>
  );
}

/** Chi tiết bài cho cán bộ xã (deep link /commune/market/:id): ảnh, báo cáo, bình luận, nút giữ bài / gỡ bài. */
export function MarketModerationPostPage() {
  const id = Number(useParams().id);
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [form] = Form.useForm<{ note: string }>();
  const detail = useQuery({
    queryKey: [...marketKeys.all, 'detail', id],
    queryFn: () => api.get<Schemas['MarketAdminDetailDto']>(`/api/market-moderation/posts/${id}`),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  const decide = useMutation({
    mutationFn: ({ action, note }: { action: 'approve' | 'reject'; note?: string }) =>
      api.post<AdminPost>(`/api/market-moderation/posts/${id}/${action}`, { note }),
    onSuccess: (p, v) => {
      message.success(v.action === 'approve' ? `Đã giữ bài ${p.code}` : `Đã gỡ bài ${p.code}`);
      setRejecting(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: marketKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const back = (
    <Link to=".." relative="path">
      ← Chợ cộng đồng
    </Link>
  );

  if (detail.isLoading) return <LoadingBlock rows={5} />;
  if (detail.error) {
    if (detail.error instanceof ApiError && detail.error.status === 404) {
      return <Result status="404" title="Không tìm thấy bài" extra={back} />;
    }
    return (
      <ErrorBlock error={detail.error} onRetry={() => void detail.refetch()} />
    );
  }
  const { post: p, reports, comments, matchedKeywords } = detail.data!;
  const openReports = reports.filter((r) => !r.resolvedAt);
  const needsDecision = p.moderation === 'PENDING_REVIEW' || p.openReports > 0;

  return (
    <>
      {back}
      <Card
        style={{ marginTop: 12 }}
        title={
          <Space>
            {p.code}
            <ModerationTag post={p} />
          </Space>
        }
        extra={
          <Space>
            {p.moderation !== 'PUBLISHED' || p.openReports > 0 ? (
              <Popconfirm
                title={p.moderation === 'PUBLISHED' ? 'Giữ bài và đóng các báo cáo?' : 'Cho bài hiển thị lại?'}
                okText="Đồng ý"
                cancelText="Thôi"
                onConfirm={() => decide.mutate({ action: 'approve' })}
              >
                <Button type="primary" loading={decide.isPending && decide.variables?.action === 'approve'}>
                  {p.moderation === 'PUBLISHED' ? 'Giữ bài' : 'Duyệt cho hiển thị'}
                </Button>
              </Popconfirm>
            ) : null}
            {p.moderation !== 'REJECTED' && (
              <Button danger onClick={() => setRejecting(true)}>
                Gỡ bài
              </Button>
            )}
          </Space>
        }
      >
        {needsDecision && p.moderationNote && (
          <Alert type="warning" showIcon message={p.moderationNote} style={{ marginBottom: 12 }} />
        )}
        {p.moderation === 'REJECTED' && p.moderationNote && (
          <Alert type="error" showIcon message={`Lý do gỡ: ${p.moderationNote}`} style={{ marginBottom: 12 }} />
        )}
        {decide.error && <Alert type="error" showIcon message={errorText(decide.error)} style={{ marginBottom: 12 }} />}
        <Descriptions column={{ xs: 1, md: 2 }} size="small" style={{ marginBottom: 12 }}>
          <Descriptions.Item label="Người đăng">{p.author.displayName}</Descriptions.Item>
          <Descriptions.Item label="Tổ">{p.area.name}</Descriptions.Item>
          <Descriptions.Item label="Đăng lúc">
            <DateText value={p.createdAt} withTime />
            {p.editedAt && ' · Đã chỉnh sửa'}
          </Descriptions.Item>
          <Descriptions.Item label="Phân loại">
            <Space size={[4, 4]} wrap>
              {p.tags.map((t) => (
                <StatusTag key={t} tone="info">
                  {MARKET_TAG_LABELS[t]}
                </StatusTag>
              ))}
              <StatusTag>{MARKET_CATEGORY_LABELS[p.category]}</StatusTag>
              <StatusTag tone={p.status === 'OPEN' ? 'success' : 'neutral'}>{MARKET_STATUS_LABELS[p.status]}</StatusTag>
              {p.hidden && <Tag>Người đăng đã ẩn</Tag>}
            </Space>
          </Descriptions.Item>
          {matchedKeywords.length > 0 && (
            <Descriptions.Item label="Khớp bộ lọc">
              <Space size={[4, 4]} wrap>
                {matchedKeywords.map((k) => (
                  <Tag key={k} color="orange">
                    {k}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>
        <Typography.Paragraph style={{ whiteSpace: 'pre-line' }}>{p.caption}</Typography.Paragraph>
        {p.photoUrls.length > 0 && (
          <Image.PreviewGroup>
            <Space wrap>
              {p.photoUrls.map((url, i) => (
                <AuthImage key={url} path={url} alt={`Ảnh ${i + 1} của ${p.code}`} size={160} />
              ))}
            </Space>
          </Image.PreviewGroup>
        )}
      </Card>

      <Card style={{ marginTop: 12 }} title={`Báo cáo (${openReports.length} chưa xử lý / ${reports.length})`}>
        <List
          dataSource={reports}
          locale={{ emptyText: 'Chưa có báo cáo' }}
          renderItem={(r) => (
            <List.Item key={r.id}>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={r.resolvedAt ? 'default' : 'red'}>{REPORT_REASON_LABELS[r.reason]}</Tag>
                    {r.reporterName}
                  </Space>
                }
                description={
                  <>
                    <DateText value={r.createdAt} withTime />
                    {r.resolution && ` · Đã xử lý: ${r.resolution === 'KEPT' ? 'giữ bài' : 'gỡ bài'}`}
                  </>
                }
              />
              {r.note}
            </List.Item>
          )}
        />
      </Card>

      <Card style={{ marginTop: 12 }} title={`Bình luận (${p.commentCount})`}>
        <List
          dataSource={comments}
          locale={{ emptyText: 'Chưa có bình luận' }}
          renderItem={(c) => (
            <List.Item key={c.id}>
              <List.Item.Meta title={c.authorName} description={<DateText value={c.createdAt} withTime />} />
              <div style={{ whiteSpace: 'pre-line' }}>{c.content}</div>
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title={`Gỡ bài ${p.code}`}
        open={rejecting}
        okText="Gỡ bài"
        okButtonProps={{ danger: true, loading: decide.isPending }}
        cancelText="Thôi"
        onCancel={() => setRejecting(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(v) => decide.mutate({ action: 'reject', note: v.note })}>
          <Form.Item
            name="note"
            label="Lý do gỡ (người đăng sẽ thấy)"
            rules={[{ required: true, whitespace: true, message: 'Nhập lý do gỡ bài' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
