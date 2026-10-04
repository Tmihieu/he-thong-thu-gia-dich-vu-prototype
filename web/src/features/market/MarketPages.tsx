import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Button, Card, Image, Input, List, Result, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { api, ApiError } from '../../api/client';
import type { components } from '../../api/schema';
import { AuthImage } from '../../shared/AuthImage';
import { DateText } from '../../shared/DateText';
import { PageHeader } from '../../shared/PageHeader';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../shared/StateBlock';
import { StatusTag } from '../../shared/StatusTag';
import {
  MARKET_CATEGORY_LABELS,
  MARKET_STATUS_LABELS,
  MARKET_TAG_LABELS,
  type MarketCategory,
  type MarketTag,
} from '../../shared/labels';

type Schemas = components['schemas'];
type MarketPost = Schemas['MarketPostDto'];

const PAGE_SIZE = 20;

function PostTags({ post }: { post: MarketPost }) {
  return (
    <Space size={[4, 4]} wrap>
      <StatusTag tone={post.status === 'OPEN' ? 'success' : 'neutral'}>{MARKET_STATUS_LABELS[post.status]}</StatusTag>
      {post.tags.map((t) => (
        <StatusTag key={t} tone="info">
          {MARKET_TAG_LABELS[t]}
        </StatusTag>
      ))}
      <StatusTag>{MARKET_CATEGORY_LABELS[post.category]}</StatusTag>
    </Space>
  );
}

function PostMeta({ post }: { post: MarketPost }) {
  return (
    <Typography.Text type="secondary">
      {post.author.displayName} · {post.area.name} · <DateText value={post.createdAt} withTime />
      {post.editedAt && ' · Đã chỉnh sửa'}
    </Typography.Text>
  );
}

/**
 * "Chợ cộng đồng" cho cả 5 vai trò nội bộ: chỉ đọc (spec §3) — không đăng/bình luận/lưu/chặn/gọi, không SĐT.
 * Cùng một component gắn vào menu mọi vai trò.
 */
export function MarketListPage() {
  const [q, setQ] = useState('');
  const [tags, setTags] = useState<MarketTag[]>([]);
  const [category, setCategory] = useState<MarketCategory>();
  const [areaId, setAreaId] = useState<number>();
  const metadata = useQuery({
    queryKey: ['market', 'metadata'],
    queryFn: () => api.get<Schemas['MarketMetadataDto']>('/api/market/metadata'),
  });
  const posts = useInfiniteQuery({
    queryKey: ['market', 'posts', { q, tags, category, areaId }],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api.get<Schemas['PageDtoMarketPostDto']>('/api/market/posts', {
        params: { q: q.trim(), tags: tags.join(','), category, areaId, page: pageParam, size: PAGE_SIZE },
        signal,
      }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
  const items = posts.data?.pages.flatMap((p) => p.items) ?? [];
  const meta = metadata.data;

  return (
    <>
      <PageHeader title="Chợ cộng đồng" description="Tin người dân đăng tìm, bán, cho tặng, đổi đồ cũ. Vai trò nội bộ chỉ xem." />
      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search allowClear placeholder="Tìm theo nội dung" maxLength={100} onSearch={setQ} style={{ width: 240 }} />
        <Select<MarketTag[]>
          mode="multiple"
          allowClear
          aria-label="Loại tin"
          placeholder="Loại tin"
          style={{ minWidth: 200 }}
          value={tags}
          onChange={setTags}
          options={(meta?.tags ?? []).map((t) => ({ value: t, label: MARKET_TAG_LABELS[t] }))}
        />
        <Select<MarketCategory>
          allowClear
          aria-label="Danh mục"
          placeholder="Danh mục"
          style={{ minWidth: 180 }}
          value={category}
          onChange={setCategory}
          options={(meta?.categories ?? []).map((c) => ({ value: c, label: MARKET_CATEGORY_LABELS[c] }))}
        />
        <Select<number>
          allowClear
          showSearch
          optionFilterProp="label"
          aria-label="Tổ"
          placeholder="Tổ"
          style={{ minWidth: 180 }}
          value={areaId}
          onChange={setAreaId}
          options={(meta?.areas ?? []).map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
        />
      </Space>
      {posts.error ? (
        <ErrorBlock error={posts.error} onRetry={() => void posts.refetch()} />
      ) : (
        <List<MarketPost>
          loading={posts.isLoading}
          dataSource={items}
          locale={{ emptyText: <EmptyBlock title="Chưa có tin phù hợp" hint="Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm." /> }}
          renderItem={(p) => (
            <List.Item key={p.id} extra={p.photoUrls[0] && <AuthImage path={p.photoUrls[0]} alt={`Ảnh ${p.code}`} size={96} />}>
              <List.Item.Meta
                title={<Link to={String(p.id)}>{p.code}</Link>}
                description={<PostMeta post={p} />}
              />
              <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ whiteSpace: 'pre-line' }}>
                {p.caption}
              </Typography.Paragraph>
              <PostTags post={p} />
              <Typography.Text type="secondary"> · {p.commentCount} bình luận</Typography.Text>
            </List.Item>
          )}
          loadMore={
            posts.hasNextPage && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Button loading={posts.isFetchingNextPage} onClick={() => void posts.fetchNextPage()}>
                  Tải thêm
                </Button>
              </div>
            )
          }
        />
      )}
    </>
  );
}

/** Chi tiết tin (deep link /<vai trò>/market/:id), bình luận cũ trước, tải thêm theo trang. */
export function MarketPostPage() {
  const id = Number(useParams().id);
  const post = useQuery({
    queryKey: ['market', 'post', id],
    queryFn: () => api.get<MarketPost>(`/api/market/posts/${id}`),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  const comments = useInfiniteQuery({
    queryKey: ['market', 'comments', id],
    initialPageParam: 0,
    enabled: post.isSuccess,
    queryFn: ({ pageParam, signal }) =>
      api.get<Schemas['PageDtoMarketCommentDto']>(`/api/market/posts/${id}/comments`, {
        params: { page: pageParam, size: PAGE_SIZE },
        signal,
      }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
  const back = (
    <Link to=".." relative="path">
      ← Chợ cộng đồng
    </Link>
  );

  if (post.isLoading) return <LoadingBlock rows={5} />;
  if (post.error) {
    if (post.error instanceof ApiError && post.error.status === 404) {
      return <Result status="404" title="Bài không còn khả dụng" extra={back} />;
    }
    return (
      <ErrorBlock error={post.error} onRetry={() => void post.refetch()} />
    );
  }
  const p = post.data!;
  const list = comments.data?.pages.flatMap((c) => c.items) ?? [];

  return (
    <>
      {back}
      <Card style={{ marginTop: 12 }} title={p.code}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <PostMeta post={p} />
          <PostTags post={p} />
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
        </Space>
      </Card>
      <Card style={{ marginTop: 12 }} title={`Bình luận (${p.commentCount})`}>
        {comments.error ? (
          <ErrorBlock error={comments.error} onRetry={() => void comments.refetch()} />
        ) : (
          <List
            loading={comments.isLoading}
            dataSource={list}
            locale={{ emptyText: 'Chưa có bình luận' }}
            renderItem={(c) => (
              <List.Item key={c.id}>
                <List.Item.Meta
                  title={c.author.displayName}
                  description={<DateText value={c.createdAt} withTime />}
                />
                <div style={{ whiteSpace: 'pre-line' }}>{c.content}</div>
              </List.Item>
            )}
            loadMore={
              comments.hasNextPage && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Button loading={comments.isFetchingNextPage} onClick={() => void comments.fetchNextPage()}>
                    Xem thêm bình luận
                  </Button>
                </div>
              )
            }
          />
        )}
      </Card>
    </>
  );
}
