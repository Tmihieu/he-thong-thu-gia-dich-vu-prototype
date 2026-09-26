import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type IssueRequest = components['schemas']['IssueRequest'];
export type IssueResult = components['schemas']['IssueResultDto'];
export type ChargeRequestSummary = components['schemas']['ChargeRequestDto'];
export type Charge = components['schemas']['ChargeDto'];
export type ChargePage = components['schemas']['ChargePageDto'];
export type FeeType = components['schemas']['FeeTypeDto'];

export interface ChargeQuery {
  periodId?: number;
  areaId?: number;
  status?: Charge['status'];
  page: number;
  size: number;
}

export const billingKeys = {
  requests: ['billing', 'charge-requests'] as const,
  charges: ['billing', 'charges'] as const,
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
