import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type BulkyRequest = components['schemas']['BulkyRequestDto'];
export type BulkyStatus = BulkyRequest['status'];

const bulkyKeys = { all: ['bulky-requests'] as const };

export const BULKY_STATUS_LABELS: Record<BulkyStatus, string> = {
  PENDING: 'Chờ công ty báo phí',
  QUOTED: 'Đã báo phí',
  COLLECTED: 'Đã thu gom',
  CANCELLED: 'Đã hủy',
};

export const BULKY_STATUS_COLORS: Record<BulkyStatus, string> = {
  PENDING: 'orange',
  QUOTED: 'blue',
  COLLECTED: 'green',
  CANCELLED: 'default',
};

export const BULKY_ITEM_LABELS: Record<BulkyRequest['itemType'], string> = {
  MATTRESS: 'Nệm, chăn ga khối lớn',
  FURNITURE: 'Tủ, bàn, ghế, sofa',
  LARGE_APPLIANCE: 'Thiết bị điện lớn',
  DEBRIS: 'Xà bần, cành cây lớn',
};

export const DAY_SLOT_LABELS: Record<NonNullable<BulkyRequest['preferredSlot']>, string> = {
  MORNING: 'Buổi sáng',
  AFTERNOON: 'Buổi chiều',
};

/** Yêu cầu rác cồng kềnh của công ty đang đăng nhập (T45). */
export function useBulkyRequests() {
  return useQuery({ queryKey: bulkyKeys.all, queryFn: () => api.get<BulkyRequest[]>('/api/bulky-requests') });
}

function useBulkyMutation<V>(fn: (v: V) => Promise<BulkyRequest>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Cả khi lỗi: yêu cầu có thể vừa bị hộ hủy, tải lại để bỏ nút thao tác cũ.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: bulkyKeys.all }),
  });
}

export function useQuoteBulky() {
  return useBulkyMutation(({ id, ...body }: { id: number; fee: number; scheduledDate: string }) =>
    api.post<BulkyRequest>(`/api/bulky-requests/${id}/quote`, body),
  );
}

export function useCollectBulky() {
  return useBulkyMutation((id: number) => api.post<BulkyRequest>(`/api/bulky-requests/${id}/collected`, {}));
}

export function useCancelBulky() {
  return useBulkyMutation(({ id, reason }: { id: number; reason: string }) =>
    api.post<BulkyRequest>(`/api/bulky-requests/${id}/cancel`, { reason }),
  );
}
