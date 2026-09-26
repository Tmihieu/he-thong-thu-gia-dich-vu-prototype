import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type TariffVersion = components['schemas']['TariffVersionDto'];
export type TariffRate = components['schemas']['TariffRateDto'];
export type Period = components['schemas']['PeriodDto'];
export type OpenPeriodRequest = components['schemas']['OpenPeriodRequest'];
export type District = components['schemas']['DistrictDto'];
export type Area = components['schemas']['AreaDto'];
export type Company = components['schemas']['CompanyDto'];
export type AreaAssignment = components['schemas']['AreaAssignmentDto'];
export type AssignRequest = components['schemas']['AssignRequest'];
export type Subject = components['schemas']['SubjectDto'];
export type SubjectPage = components['schemas']['SubjectPageDto'];
export type SubjectRequest = components['schemas']['SubjectRequest'];
export type Contract = components['schemas']['ContractDto'];
export type ContractRequest = components['schemas']['ContractRequest'];

export interface SubjectQuery {
  areaId?: number;
  status?: Subject['status'];
  q?: string;
  page: number;
  size: number;
}

export const masterdataKeys = {
  tariffs: ['masterdata', 'tariffs'] as const,
  periods: ['masterdata', 'periods'] as const,
  districts: ['masterdata', 'districts'] as const,
  areas: ['masterdata', 'areas'] as const,
  companies: ['masterdata', 'companies'] as const,
  assignments: ['masterdata', 'assignments'] as const,
  subjects: ['masterdata', 'subjects'] as const,
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

export function useDistricts() {
  return useQuery({ queryKey: masterdataKeys.districts, queryFn: () => api.get<District[]>('/api/masterdata/districts') });
}

export function useAreas() {
  return useQuery({ queryKey: masterdataKeys.areas, queryFn: () => api.get<Area[]>('/api/masterdata/areas') });
}

export function useCompanies() {
  return useQuery({ queryKey: masterdataKeys.companies, queryFn: () => api.get<Company[]>('/api/masterdata/companies') });
}

/** Phân công đang hiệu lực vào ngày ISO {@code date}. */
export function useActiveAssignments(date: string) {
  return useQuery({
    queryKey: [...masterdataKeys.assignments, 'active', date],
    queryFn: () => api.get<AreaAssignment[]>('/api/masterdata/area-assignments', { params: { date } }),
  });
}

export function useAreaHistory(areaId: number | null) {
  return useQuery({
    queryKey: [...masterdataKeys.assignments, 'history', areaId],
    queryFn: () => api.get<AreaAssignment[]>(`/api/masterdata/areas/${areaId}/assignments`),
    enabled: areaId !== null,
  });
}

export function useAssignAreas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignRequest) => api.post<AreaAssignment[]>('/api/masterdata/area-assignments', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterdataKeys.assignments }),
  });
}

export function useSubjects(query: SubjectQuery) {
  return useQuery({
    queryKey: [...masterdataKeys.subjects, 'list', query],
    queryFn: () => api.get<SubjectPage>('/api/masterdata/subjects', { params: { ...query } }),
    placeholderData: (prev) => prev,
  });
}

function useSubjectMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: masterdataKeys.subjects });
      void qc.invalidateQueries({ queryKey: masterdataKeys.areas });
    },
  });
}

export function useCreateSubject() {
  return useSubjectMutation((body: SubjectRequest) => api.post<Subject>('/api/masterdata/subjects', body));
}

export function useUpdateSubject() {
  return useSubjectMutation(({ id, body }: { id: number; body: SubjectRequest }) =>
    api.put<Subject>(`/api/masterdata/subjects/${id}`, body),
  );
}

export function useEndSubject() {
  return useSubjectMutation(({ id, endDate, reason }: { id: number; endDate: string; reason?: string }) =>
    api.post<Subject>(`/api/masterdata/subjects/${id}/end`, { endDate, reason }),
  );
}

export function useAddContract() {
  return useSubjectMutation(({ subjectId, body }: { subjectId: number; body: ContractRequest }) =>
    api.post<Contract>(`/api/masterdata/subjects/${subjectId}/contracts`, body),
  );
}

export function useUpdateContract() {
  return useSubjectMutation(({ id, body }: { id: number; body: ContractRequest }) =>
    api.put<Contract>(`/api/masterdata/contracts/${id}`, body),
  );
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
