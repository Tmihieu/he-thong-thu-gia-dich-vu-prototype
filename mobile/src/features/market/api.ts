import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';
import type { UploadedPhoto } from '../photos/photos';
import type { MarketCategory, MarketTag } from '../../shared/labels';

type S = components['schemas'];
export type MarketPost = S['MarketPostDto'];
export type MarketComment = S['MarketCommentDto'];
export type MarketEdit = S['MarketEditDto'];
export type MarketSaved = Omit<S['MarketSavedDto'], 'post'> & { post: MarketPost | null };
export type CreateMarketPost = S['CreateMarketPostRequest'];
export type UpdateMarketPost = S['UpdateMarketPostRequest'];
type Page<T> = { items: T[]; total: number; page: number; size: number; hasMore: boolean };

export interface FeedFilter {
  q: string;
  tags: MarketTag[];
  category?: MarketCategory;
  areaId?: number;
}
export type MineFilter = 'OPEN' | 'CLOSED' | 'HIDDEN';

const PAGE_SIZE = 20;
const W = '/api/citizen/market';

/** UUID v4 cho `clientRequestId` (Hermes không chắc có `crypto.randomUUID`; chỉ cần khác nhau, không cần bí mật). */
export function newUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Ghép các trang, bỏ id trùng (bài mới chen vào làm xê dịch offset — spec §4.2). */
export function flattenUnique<T extends { id: number }>(pages: Page<T>[] | undefined): T[] {
  const seen = new Set<number>();
  return (pages ?? []).flatMap((p) => p.items).filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

export const marketApi = {
  metadata: () => api.get<S['MarketMetadataDto']>('/api/market/metadata'),
  feed: (f: FeedFilter, page: number) =>
    api.get<Page<MarketPost>>('/api/market/posts', {
      params: { q: f.q.trim(), tags: f.tags.join(','), category: f.category, areaId: f.areaId, page, size: PAGE_SIZE },
    }),
  post: (id: number) => api.get<MarketPost>(`/api/market/posts/${id}`),
  comments: (id: number, page: number) =>
    api.get<Page<MarketComment>>(`/api/market/posts/${id}/comments`, { params: { page, size: PAGE_SIZE } }),
  mine: (f: MineFilter, page: number) =>
    api.get<Page<MarketPost>>(`${W}/posts/mine`, {
      params: f === 'HIDDEN' ? { hidden: true, page, size: PAGE_SIZE } : { status: f, hidden: false, page, size: PAGE_SIZE },
    }),
  create: (body: CreateMarketPost) => api.post<MarketPost>(`${W}/posts`, body),
  edit: (id: number) => api.get<MarketEdit>(`${W}/posts/${id}/edit`),
  update: (id: number, body: UpdateMarketPost) => api.patch<MarketPost>(`${W}/posts/${id}`, body),
  setStatus: (id: number, status: 'OPEN' | 'CLOSED', version: number) =>
    api.post<MarketPost>(`${W}/posts/${id}/status`, { status, version }),
  setHidden: (id: number, hidden: boolean, version: number) =>
    api.put<MarketPost>(`${W}/posts/${id}/visibility`, { hidden, version }),
  comment: (id: number, content: string, clientRequestId: string) =>
    api.post<MarketComment>(`${W}/posts/${id}/comments`, { content, clientRequestId }),
  contact: (id: number) => api.get<{ phone: string }>(`${W}/posts/${id}/contact`),
  uploadImage: async (form: FormData): Promise<UploadedPhoto> => {
    const r = await api.upload<{ id: number; previewUrl: string }>(`${W}/images`, form);
    return { name: String(r.id), url: r.previewUrl };
  },
  saved: (page: number) => api.get<Page<MarketSaved>>(`${W}/saved`, { params: { page, size: PAGE_SIZE } }),
  save: (id: number, on: boolean) => (on ? api.put(`${W}/saved/${id}`) : api.delete(`${W}/saved/${id}`)),
  blocks: (page: number) => api.get<Page<S['MarketBlockDto']>>(`${W}/blocks`, { params: { page, size: PAGE_SIZE } }),
  block: (citizenId: number, on: boolean) =>
    on ? api.put(`${W}/blocks/${citizenId}`) : api.delete(`${W}/blocks/${citizenId}`),
};

/** Mọi khóa chợ bắt đầu bằng 'market' để invalidate một lần (spec §6.2: sau chặn/ẩn làm mới feed, chi tiết, lưu…). */
export const marketKeys = {
  all: ['market'] as const,
  metadata: ['market', 'metadata'] as const,
  feed: (f: FeedFilter) => ['market', 'feed', f] as const,
  post: (id: number) => ['market', 'post', id] as const,
  comments: (id: number) => ['market', 'comments', id] as const,
  mine: (f: MineFilter) => ['market', 'mine', f] as const,
  saved: ['market', 'saved'] as const,
  blocks: ['market', 'blocks'] as const,
  edit: (id: number) => ['market', 'edit', id] as const,
};

function paged<T>(queryKey: readonly unknown[], fetch: (page: number) => Promise<Page<T>>) {
  return {
    queryKey,
    queryFn: ({ pageParam }: { pageParam: number }) => fetch(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last: Page<T>) => (last.hasMore ? last.page + 1 : undefined),
  };
}

export const useMarketMetadata = () =>
  useQuery({ queryKey: marketKeys.metadata, queryFn: marketApi.metadata, staleTime: 30 * 60_000 });
export const useMarketFeed = (f: FeedFilter) => useInfiniteQuery(paged(marketKeys.feed(f), (p) => marketApi.feed(f, p)));
export const useMyPosts = (f: MineFilter) => useInfiniteQuery(paged(marketKeys.mine(f), (p) => marketApi.mine(f, p)));
export const useSavedPosts = () => useInfiniteQuery(paged(marketKeys.saved, marketApi.saved));
export const useBlocks = () => useInfiniteQuery(paged(marketKeys.blocks, marketApi.blocks));
export const useMarketComments = (id: number) =>
  useInfiniteQuery({
    ...paged(marketKeys.comments(id), (p) => marketApi.comments(id, p)),
    enabled: Number.isFinite(id),
    refetchInterval: 30_000,
  });

export function useMarketPost(id: number) {
  return useQuery({
    queryKey: marketKeys.post(id),
    queryFn: () => marketApi.post(id),
    enabled: Number.isFinite(id),
    retry: (n, e) => (e as { status?: number }).status !== 404 && n < 2,
  });
}

export function useMarketEdit(id: number | null) {
  return useQuery({
    queryKey: marketKeys.edit(id ?? 0),
    queryFn: () => marketApi.edit(id as number),
    enabled: id !== null,
    // Không tự tải lại khi đang sửa: người dùng bấm "Tải lại" khi 409.
    staleTime: Infinity,
    gcTime: 0,
  });
}

/** Mutation chợ: xong (thành công hay lỗi, vd. 409/404) đều làm mới mọi query chợ. */
export function useMarketMutation<V, R>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => queryClient.invalidateQueries({ queryKey: marketKeys.all }) });
}
