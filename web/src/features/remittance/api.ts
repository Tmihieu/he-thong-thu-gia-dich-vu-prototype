import { useQuery } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type LedgerRow = components['schemas']['LedgerRowDto'];
export type AreaProgress = components['schemas']['AreaProgressDto'];
export type Receipt = components['schemas']['ReceiptDto'];
export type ReceiptIssue = components['schemas']['IssueDto'];

export const remittanceKeys = {
  ledger: ['remittance', 'ledger'] as const,
  areaProgress: ['remittance', 'area-progress'] as const,
  receipts: ['remittance', 'receipts'] as const,
  receiptIssues: ['remittance', 'receipt-issues'] as const,
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

/** Phiếu thu theo kỳ; công ty chỉ nhận phiếu của mình (backend lọc). */
export function useReceipts(periodId: number | undefined, companyId?: number) {
  return useQuery({
    queryKey: [...remittanceKeys.receipts, periodId, companyId],
    queryFn: () => api.get<Receipt[]>('/api/remittance/receipts', { params: { periodId, companyId } }),
    enabled: periodId !== undefined,
  });
}

export function useReceiptIssues(status?: ReceiptIssue['status']) {
  return useQuery({
    queryKey: [...remittanceKeys.receiptIssues, status],
    queryFn: () => api.get<ReceiptIssue[]>('/api/remittance/receipt-issues', { params: { status } }),
  });
}
