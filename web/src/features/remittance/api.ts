import { useQuery } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type LedgerRow = components['schemas']['LedgerRowDto'];
export type AreaProgress = components['schemas']['AreaProgressDto'];

export const remittanceKeys = {
  ledger: ['remittance', 'ledger'] as const,
  areaProgress: ['remittance', 'area-progress'] as const,
  receipts: ['remittance', 'receipts'] as const,
};

/** Sổ công ty–kỳ: nguồn số liệu duy nhất cho tiến độ, đối soát, màn công ty (T24). */
export function useCompanyLedger(periodId: number | undefined) {
  return useQuery({
    queryKey: [...remittanceKeys.ledger, periodId],
    queryFn: () => api.get<LedgerRow[]>('/api/remittance/ledger', { params: { periodId } }),
    enabled: periodId !== undefined,
  });
}

export function useAreaProgress(periodId: number | undefined) {
  return useQuery({
    queryKey: [...remittanceKeys.areaProgress, periodId],
    queryFn: () => api.get<AreaProgress[]>('/api/remittance/area-progress', { params: { periodId } }),
    enabled: periodId !== undefined,
  });
}
