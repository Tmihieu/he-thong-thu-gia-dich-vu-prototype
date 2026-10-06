import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type CollectorCharge = components['schemas']['CollectorChargeDto'];
export type PaymentRequest = components['schemas']['PaymentRequest'];
export type PaymentResult = components['schemas']['PaymentResultDto'];
export type CashHeld = components['schemas']['CashHeldDto'];
export type Handover = components['schemas']['HandoverDto'];
export type Collector = components['schemas']['CollectorDto'];
export type CollectorPayment = components['schemas']['CollectorPaymentDto'];
export type HistoryEntry = components['schemas']['HistoryEntryDto'];
export type SubjectReportRequest = components['schemas']['SubjectReportRequest'];

export const collectionKeys = {
  all: ['collection'] as const,
  myWork: ['collection', 'my-work'] as const,
  cashHeld: ['collection', 'cash-held'] as const,
  handovers: ['collection', 'handovers'] as const,
  companyWork: ['collection', 'company-work'] as const,
  collectors: ['collection', 'collectors'] as const,
  collectorPayments: ['collection', 'collector-payments'] as const,
  history: ['collection', 'history'] as const,
};

/** Danh sách thu của người đi thu: mọi khoản của công ty kèm đã thu. */
export function useMyWork(periodId: number | undefined) {
  return useQuery({
    queryKey: [...collectionKeys.myWork, periodId],
    queryFn: () => api.get<CollectorCharge[]>('/api/collection/my-work', { params: { periodId } }),
    enabled: periodId !== undefined,
  });
}

/** Khoản mọi kỳ của người đi thu, để đánh dấu các kỳ trước trên thẻ hộ. */
// ponytail: API giới hạn 500 khoản/lần; công ty đông hộ nhiều kỳ thì kỳ cũ nhất bị cắt, thêm API "khoản theo hộ" nếu cần đủ.
export function useMyWorkAllPeriods() {
  return useQuery({
    queryKey: [...collectionKeys.myWork, 'all'],
    queryFn: () => api.get<CollectorCharge[]>('/api/collection/my-work'),
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

/** Khoản của công ty trong kỳ, kèm đã thu; {@code collectorId}: chỉ khoản người đi thu đó đã thu (UC-33). */
export function useCompanyWork(periodId: number | undefined, collectorId?: number) {
  return useQuery({
    queryKey: [...collectionKeys.companyWork, periodId, collectorId ?? null],
    queryFn: () => api.get<CollectorCharge[]>('/api/collection/company-work', { params: { periodId, collectorId } }),
    enabled: periodId !== undefined,
  });
}

export function useCollectors() {
  return useQuery({ queryKey: collectionKeys.collectors, queryFn: () => api.get<Collector[]>('/api/collection/collectors') });
}

/** Lịch sử thu của một người đi thu của công ty, mới trước (UC-33); chỉ gọi khi {@code enabled}. */
export function useCollectorPayments(collectorId: number, enabled = true) {
  return useQuery({
    queryKey: [...collectionKeys.collectorPayments, collectorId],
    queryFn: () => api.get<CollectorPayment[]>(`/api/collection/collectors/${collectorId}/payments`),
    enabled,
  });
}

/** Lịch sử hộ trên một khoản: các lần thanh toán, cũ trước. */
export function useChargeHistory(chargeId: number | undefined) {
  return useQuery({
    queryKey: [...collectionKeys.history, chargeId],
    queryFn: () => api.get<HistoryEntry[]>(`/api/collection/charges/${chargeId}/history`),
    enabled: chargeId !== undefined,
  });
}

/** Người đi thu báo hộ chuyển đi / sai thông tin: máy chủ chỉ phát thông báo tới xã và công ty (G7). */
export function useReportSubject() {
  return useMutation({
    mutationFn: (body: SubjectReportRequest) => api.post<void>('/api/collection/subject-reports', body),
  });
}
