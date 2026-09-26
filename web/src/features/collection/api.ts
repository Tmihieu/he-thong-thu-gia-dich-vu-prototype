import { useQuery } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type CollectorCharge = components['schemas']['CollectorChargeDto'];
export type PaymentRequest = components['schemas']['PaymentRequest'];
export type PaymentResult = components['schemas']['PaymentResultDto'];
export type VisitRequest = components['schemas']['VisitRequest'];
export type Visit = components['schemas']['VisitDto'];
export type CashHeld = components['schemas']['CashHeldDto'];
export type Handover = components['schemas']['HandoverDto'];

export const collectionKeys = {
  all: ['collection'] as const,
  myWork: ['collection', 'my-work'] as const,
  cashHeld: ['collection', 'cash-held'] as const,
  handovers: ['collection', 'handovers'] as const,
};

/** Danh sách thu của người đi thu: khoản trong tổ được giao kèm đã thu và lượt ghé gần nhất. */
export function useMyWork(periodId: number | undefined) {
  return useQuery({
    queryKey: [...collectionKeys.myWork, periodId],
    queryFn: () => api.get<CollectorCharge[]>('/api/collection/my-work', { params: { periodId } }),
    enabled: periodId !== undefined,
  });
}

/** Tiền mặt đang giữ: người đi thu nhận dòng của mình; quản lý công ty nhận cả công ty. */
export function useCashHeld() {
  return useQuery({
    queryKey: collectionKeys.cashHeld,
    queryFn: () => api.get<CashHeld[]>('/api/collection/cash/held'),
  });
}

export function useHandovers() {
  return useQuery({
    queryKey: collectionKeys.handovers,
    queryFn: () => api.get<Handover[]>('/api/collection/cash/handovers'),
  });
}
