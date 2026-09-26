import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type TariffVersion = components['schemas']['TariffVersionDto'];
export type TariffRate = components['schemas']['TariffRateDto'];
export type Period = components['schemas']['PeriodDto'];
export type OpenPeriodRequest = components['schemas']['OpenPeriodRequest'];

export const masterdataKeys = {
  tariffs: ['masterdata', 'tariffs'] as const,
  periods: ['masterdata', 'periods'] as const,
};

export function useTariffs() {
  return useQuery({
    queryKey: masterdataKeys.tariffs,
    queryFn: () => api.get<TariffVersion[]>('/api/masterdata/tariffs'),
  });
}

export function usePeriods() {
  return useQuery({
    queryKey: masterdataKeys.periods,
    queryFn: () => api.get<Period[]>('/api/masterdata/periods'),
  });
}

export function useOpenPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OpenPeriodRequest) => api.post<Period>('/api/masterdata/periods', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterdataKeys.periods }),
  });
}

export function useStartCollecting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<Period>(`/api/masterdata/periods/${id}/start`),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterdataKeys.periods }),
  });
}

/** Phiên bản biểu giá đã ban hành có hiệu lực vào ngày ISO {@code date} (khớp TariffService ở backend). */
export function tariffOn(versions: TariffVersion[], date: string): TariffVersion | undefined {
  const covering = versions.filter(
    (v) => v.status !== 'DRAFT' && v.validFrom <= date && (v.validTo === null || v.validTo >= date),
  );
  if (covering.length <= 1) return covering[0];
  const active = covering.filter((v) => v.status === 'ACTIVE');
  return active.length === 1 ? active[0] : undefined;
}

/** Ngày đầu kỳ từ loại + năm + số tháng/quý (khớp CollectionPeriod.open ở backend). */
export function periodStart(type: Period['periodType'], year: number | undefined, number: number | undefined) {
  if (!year || !number) return undefined;
  const month = type === 'MONTH' ? number : (number - 1) * 3 + 1;
  return dayjs(new Date(year, month - 1, 1));
}
