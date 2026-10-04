import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';
import { masterdataKeys } from '../masterdata/api';

export type IssueRequest = components['schemas']['IssueRequest'];
export type IssueResult = components['schemas']['IssueResultDto'];
export type ChargeRequestSummary = components['schemas']['ChargeRequestDto'];
export type Charge = components['schemas']['ChargeDto'];
export type ChargePage = components['schemas']['ChargePageDto'];
export type FeeType = components['schemas']['FeeTypeDto'];
export type DraftPreview = components['schemas']['DraftPreviewDto'];
export type PublishPeriodRequest = components['schemas']['PublishPeriodRequest'];
export type PublishPeriodResult = components['schemas']['PublishPeriodDto'];

export interface ChargeQuery {
  periodId?: number;
  areaId?: number;
  status?: Charge['status'];
  companyId?: number;
  page: number;
  size: number;
}

export const billingKeys = {
  requests: ['billing', 'charge-requests'] as const,
  charges: ['billing', 'charges'] as const,
  draftPreview: ['billing', 'draft-preview'] as const,
  feeTypes: ['masterdata', 'fee-types'] as const,
};

export function useFeeTypes() {
  return useQuery({ queryKey: billingKeys.feeTypes, queryFn: () => api.get<FeeType[]>('/api/masterdata/fee-types') });
}

export function useChargeRequests(periodId?: number) {
  return useQuery({
    queryKey: [...billingKeys.requests, periodId ?? 'all'],
    queryFn: () => api.get<ChargeRequestSummary[]>('/api/billing/charge-requests', { params: { periodId } }),
  });
}

export function useCharges(query: ChargeQuery) {
  return useQuery({
    queryKey: [...billingKeys.charges, query],
    queryFn: () => api.get<ChargePage>('/api/billing/charges', { params: { ...query } }),
    placeholderData: (prev) => prev,
  });
}

export function usePreviewCharges() {
  return useMutation({
    mutationFn: (body: IssueRequest) => api.post<IssueResult>('/api/billing/charge-requests/preview', body),
  });
}

export function usePublishCharges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IssueRequest) => api.post<IssueResult>('/api/billing/charge-requests', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.requests });
      void qc.invalidateQueries({ queryKey: billingKeys.charges });
    },
  });
}

/**
 * Xem trước các khoản sẽ lập khi mở kỳ dự thảo (chỉ đọc, không ghi khoản); {@code householdDueDate} trống thì theo
 * quy tắc của quản trị, kết quả trả lại hạn đã dùng.
 */
export type DraftPreviewParams = Pick<PublishPeriodRequest, 'openDate' | 'companyDueDate' | 'householdDueDate'>;

export function useDraftPreview(periodId: number | null, params: DraftPreviewParams = {}) {
  return useQuery({
    queryKey: [...billingKeys.draftPreview, periodId, params.openDate, params.companyDueDate, params.householdDueDate ?? 'default'],
    queryFn: () => api.post<DraftPreview>(`/api/billing/periods/${periodId}/draft-preview`, params),
    enabled: periodId !== null,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}

/** Mở kỳ dự thảo và phát hành phiếu yêu cầu thu toàn xã trong một bước. */
export function usePublishPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ periodId, ...body }: PublishPeriodRequest & { periodId: number }) =>
      api.post<PublishPeriodResult>(`/api/billing/periods/${periodId}/publish`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: masterdataKeys.periods });
      void qc.invalidateQueries({ queryKey: billingKeys.requests });
      void qc.invalidateQueries({ queryKey: billingKeys.charges });
    },
  });
}
