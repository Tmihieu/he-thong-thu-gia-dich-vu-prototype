import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type AuditLog = components['schemas']['AuditLogDto'];
export type AuditLogPage = components['schemas']['AuditLogPageDto'];
export type Account = components['schemas']['UserDto'];
export type CreateAccountRequest = components['schemas']['CreateUserRequest'];
export type UpdateAccountRequest = components['schemas']['UpdateUserRequest'];

export interface AuditLogQuery {
  /** Ngày ISO `yyyy-MM-dd` theo giờ Việt Nam; `to` gồm trọn ngày. */
  from?: string;
  to?: string;
  actorUsername?: string;
  action?: string;
  page: number;
  size: number;
}

export function useAuditLogs(q: AuditLogQuery) {
  return useQuery({
    queryKey: ['platform', 'audit-logs', q],
    queryFn: () => api.get<AuditLogPage>('/api/platform/audit-logs', { params: { ...q } }),
    placeholderData: (prev) => prev,
  });
}

const accountsKey = ['platform', 'users'] as const;

export function useAccounts() {
  return useQuery({ queryKey: accountsKey, queryFn: () => api.get<Account[]>('/api/platform/users') });
}

function useAccountMutation<V>(fn: (v: V) => Promise<Account>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: accountsKey }) });
}

export function useCreateAccount() {
  return useAccountMutation((body: CreateAccountRequest) => api.post<Account>('/api/platform/users', body));
}

export function useUpdateAccount() {
  return useAccountMutation(({ id, body }: { id: number; body: UpdateAccountRequest }) =>
    api.put<Account>(`/api/platform/users/${id}`, body),
  );
}

export function useSetAccountLocked() {
  return useAccountMutation(({ id, locked }: { id: number; locked: boolean }) =>
    api.post<Account>(`/api/platform/users/${id}/${locked ? 'lock' : 'unlock'}`),
  );
}

export function useResetPassword() {
  return useAccountMutation(({ id, password }: { id: number; password: string }) =>
    api.post<Account>(`/api/platform/users/${id}/password`, { password }),
  );
}

// Quản lý công ty chỉ xem người đi thu của công ty mình (BR-PLT-08); tạo, sửa, khóa do quản trị viên qua /api/platform/users.
const collectorAccountsKey = ['platform', 'collector-accounts'] as const;

export function useCollectorAccounts() {
  return useQuery({ queryKey: collectorAccountsKey, queryFn: () => api.get<Account[]>('/api/platform/collector-accounts') });
}
