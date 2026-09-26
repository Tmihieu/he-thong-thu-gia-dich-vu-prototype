import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type CollectorCharge = components['schemas']['CollectorChargeDto'];
export type PaymentRequest = components['schemas']['PaymentRequest'];
export type PaymentResult = components['schemas']['PaymentResultDto'];
export type VisitRequest = components['schemas']['VisitRequest'];
export type Visit = components['schemas']['VisitDto'];
export type CashHeld = components['schemas']['CashHeldDto'];
export type Handover = components['schemas']['HandoverDto'];
export type Collector = components['schemas']['CollectorDto'];
export type CollectorAssignment = components['schemas']['CollectorAssignmentDto'];
export type AssignCollectorRequest = components['schemas']['AssignCollectorRequest'];

export const collectionKeys = {
  all: ['collection'] as const,
  myWork: ['collection', 'my-work'] as const,
  cashHeld: ['collection', 'cash-held'] as const,
  handovers: ['collection', 'handovers'] as const,
  companyWork: ['collection', 'company-work'] as const,
  collectors: ['collection', 'collectors'] as const,
  collectorAssignments: ['collection', 'collector-assignments'] as const,
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

/** Hộ được giao của công ty: khoản các tổ công ty phụ trách trong kỳ, kèm đã thu và lượt ghé gần nhất. */
export function useCompanyWork(periodId: number | undefined) {
  return useQuery({
    queryKey: [...collectionKeys.companyWork, periodId],
    queryFn: () => api.get<CollectorCharge[]>('/api/collection/company-work', { params: { periodId } }),
    enabled: periodId !== undefined,
  });
}

export function useCollectors() {
  return useQuery({ queryKey: collectionKeys.collectors, queryFn: () => api.get<Collector[]>('/api/collection/collectors') });
}

/** Phân tổ đang hiệu lực hôm nay (phạm vi công ty người gọi). */
export function useCollectorAssignments() {
  return useQuery({
    queryKey: collectionKeys.collectorAssignments,
    queryFn: () => api.get<CollectorAssignment[]>('/api/collection/collector-assignments'),
  });
}

export function useAssignCollector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignCollectorRequest) => api.post<CollectorAssignment[]>('/api/collection/collector-assignments', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
  });
}

export function useEndCollectorAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, endDate }: { id: number; endDate: string }) =>
      api.post<CollectorAssignment>(`/api/collection/collector-assignments/${id}/end`, { endDate }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
  });
}
