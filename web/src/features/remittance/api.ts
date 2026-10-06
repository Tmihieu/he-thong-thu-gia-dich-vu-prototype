import { useQueries, useQuery } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type LedgerRow = components['schemas']['LedgerRowDto'];
export type AreaProgress = components['schemas']['AreaProgressDto'];
export type HouseholdDebt = components['schemas']['HouseholdDebtDto'];
export type HouseholdDebtPage = components['schemas']['HouseholdDebtPageDto'];
export type Receipt = components['schemas']['ReceiptDto'];
export type Payout = components['schemas']['PayoutDto'];
export type ReceiptIssue = components['schemas']['IssueDto'];

export const remittanceKeys = {
  ledger: ['remittance', 'ledger'] as const,
  areaProgress: ['remittance', 'area-progress'] as const,
  householdDebts: ['remittance', 'household-debts'] as const,
  receipts: ['remittance', 'receipts'] as const,
  payouts: ['remittance', 'payouts'] as const,
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

/** Sổ công ty–kỳ của nhiều kỳ một lúc (dùng chung cache với {@link useCompanyLedger}). */
export function useCompanyLedgers(periodIds: number[]) {
  return useQueries({
    queries: periodIds.map((periodId) => ({
      queryKey: [...remittanceKeys.ledger, periodId],
      queryFn: () => api.get<LedgerRow[]>('/api/remittance/ledger', { params: { periodId } }),
    })),
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

/** Phiếu chi trả công ty (xã trả lại tiền, UC-55); công ty chỉ nhận phiếu của mình (backend lọc). */
export function usePayouts(periodId: number | undefined, companyId?: number) {
  return useQuery({
    queryKey: [...remittanceKeys.payouts, periodId, companyId],
    queryFn: () => api.get<Payout[]>('/api/remittance/payouts', { params: { periodId, companyId } }),
    enabled: periodId !== undefined,
  });
}

export function useReceiptIssues(status?: ReceiptIssue['status']) {
  return useQuery({
    queryKey: [...remittanceKeys.receiptIssues, status],
    queryFn: () => api.get<ReceiptIssue[]>('/api/remittance/receipt-issues', { params: { status } }),
  });
}

/** Công nợ hộ (khoản Chưa thu của kỳ đã khóa); chỉ cán bộ xã và lãnh đạo gọi được. */
export function useHouseholdDebts(filter: { companyId?: number; areaId?: number; page: number; size: number }, enabled = true) {
  return useQuery({
    queryKey: [...remittanceKeys.householdDebts, filter],
    queryFn: () => api.get<HouseholdDebtPage>('/api/remittance/household-debts', { params: filter }),
    enabled,
    placeholderData: (prev) => prev,
  });
}
