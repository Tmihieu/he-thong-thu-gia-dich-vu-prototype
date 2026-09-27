import { useQuery } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type AuditLog = components['schemas']['AuditLogDto'];
export type AuditLogPage = components['schemas']['AuditLogPageDto'];

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
