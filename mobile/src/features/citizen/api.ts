import { useQuery } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

type S = components['schemas'];
export type CitizenProfile = S['CitizenProfileDto'];
export type CitizenCharge = S['CitizenChargeDto'];
export type CitizenLoginResponse = S['CitizenLoginResponse'];
export type OtpRequestResponse = S['OtpRequestResponse'];

export const citizenApi = {
  requestOtp: (phone: string) => api.post<OtpRequestResponse>('/api/citizen/auth/otp/request', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post<CitizenLoginResponse>('/api/citizen/auth/otp/verify', { phone, otp }),
  me: () => api.get<CitizenProfile>('/api/citizen/me'),
  charges: () => api.get<CitizenCharge[]>('/api/citizen/charges'),
  charge: (id: number) => api.get<CitizenCharge>(`/api/citizen/charges/${id}`),
};

export const citizenKeys = {
  me: ['citizen', 'me'] as const,
  charges: ['citizen', 'charges'] as const,
  charge: (id: number) => ['citizen', 'charges', id] as const,
};

export function useProfile() {
  return useQuery({ queryKey: citizenKeys.me, queryFn: citizenApi.me, staleTime: 5 * 60_000 });
}

export function useCharges() {
  return useQuery({ queryKey: citizenKeys.charges, queryFn: citizenApi.charges });
}

/** Khoản chưa đóng, hạn gần nhất trước; tổng còn phải đóng. */
export function summarizeCharges(charges: CitizenCharge[] | undefined) {
  const unpaid = (charges ?? []).filter((c) => c.status === 'UNPAID').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const history = (charges ?? []).filter((c) => c.status !== 'UNPAID');
  const totalRemaining = unpaid.reduce((sum, c) => sum + c.remainingAmount, 0);
  const overdueCount = unpaid.filter((c) => c.overdue).length;
  return { unpaid, history, totalRemaining, overdueCount, next: unpaid[0] ?? null };
}
