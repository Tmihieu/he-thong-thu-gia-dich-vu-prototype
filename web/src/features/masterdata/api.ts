import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type TariffVersion = components['schemas']['TariffVersionDto'];
export type TariffRate = components['schemas']['TariffRateDto'];
export type TariffDraftRequest = components['schemas']['TariffDraftRequest'];
export type CreateTariffRequest = components['schemas']['CreateTariffRequest'];
export type Period = components['schemas']['PeriodDto'];
export type OpenPeriodRequest = components['schemas']['OpenPeriodRequest'];
export type PeriodRule = components['schemas']['PeriodRuleDto'];
export type PeriodRuleRequest = components['schemas']['PeriodRuleRequest'];
export type DraftRun = components['schemas']['DraftRunDto'];
export type District = components['schemas']['DistrictDto'];
export type Area = components['schemas']['AreaDto'];
export type Company = components['schemas']['CompanyDto'];
export type CompanyRequest = components['schemas']['CompanyRequest'];
export type AreaAssignment = components['schemas']['AreaAssignmentDto'];
export type AssignRequest = components['schemas']['AssignRequest'];
export type Subject = components['schemas']['SubjectDto'];
export type SubjectPage = components['schemas']['SubjectPageDto'];
export type SubjectRequest = components['schemas']['SubjectRequest'];
export type Contract = components['schemas']['ContractDto'];
export type ContractRequest = components['schemas']['ContractRequest'];
export type Street = components['schemas']['StreetDto'];
export type StreetSuggestions = components['schemas']['SuggestDto'];
export type DuplicateSubject = components['schemas']['DuplicateDto'];

export interface SubjectQuery {
  areaId?: number;
  status?: Subject['status'];
  subjectType?: Subject['subjectType'];
  q?: string;
  page: number;
  size: number;
}

export const masterdataKeys = {
  tariffs: ['masterdata', 'tariffs'] as const,
  periods: ['masterdata', 'periods'] as const,
  periodDrafts: ['masterdata', 'periods', 'drafts'] as const,
  periodRule: ['masterdata', 'period-rule'] as const,
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

function useTariffMutation<V>(fn: (v: V) => Promise<TariffVersion>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: masterdataKeys.tariffs }) });
}

export function useCreateTariffDraft() {
  return useTariffMutation((body: CreateTariffRequest) => api.post<TariffVersion>('/api/masterdata/tariffs', body));
}

export function useUpdateTariffDraft() {
  return useTariffMutation(({ id, body }: { id: number; body: TariffDraftRequest }) =>
    api.put<TariffVersion>(`/api/masterdata/tariffs/${id}`, body),
  );
}

export function useIssueTariff() {
  return useTariffMutation((id: number) => api.post<TariffVersion>(`/api/masterdata/tariffs/${id}/issue`));
}

export function usePeriods() {
  return useQuery({
    queryKey: masterdataKeys.periods,
    queryFn: () => api.get<Period[]>('/api/masterdata/periods'),
  });
}

/** Kỳ dự thảo hệ thống đã tự tạo, đang chờ cán bộ xã mở (không nằm trong danh sách kỳ thu). */
export function useDraftPeriods() {
  return useQuery({
    queryKey: masterdataKeys.periodDrafts,
    queryFn: () => api.get<Period[]>('/api/masterdata/periods/drafts'),
  });
}

/** Quy tắc tự tạo kỳ (quản trị): chu kỳ, ngày tạo, số ngày hạn. */
export function usePeriodRule() {
  return useQuery({
    queryKey: masterdataKeys.periodRule,
    queryFn: () => api.get<PeriodRule>('/api/masterdata/period-rule'),
  });
}

export function useUpdatePeriodRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PeriodRuleRequest) => api.put<PeriodRule>('/api/masterdata/period-rule', body),
    onSuccess: (rule) => qc.setQueryData(masterdataKeys.periodRule, rule),
  });
}

/** Chạy quy tắc ngay (quản trị) để thử: tạo kỳ dự thảo nếu đã tới ngày, không thì trả lý do. */
export function useRunPeriodRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DraftRun>('/api/masterdata/period-rule/run'),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterdataKeys.periodDrafts }),
  });
}

export function useDistricts() {
  return useQuery({ queryKey: masterdataKeys.districts, queryFn: () => api.get<District[]>('/api/masterdata/districts') });
}

export function useAreas() {
  return useQuery({ queryKey: masterdataKeys.areas, queryFn: () => api.get<Area[]>('/api/masterdata/areas') });
}

export function useUpdateDistrict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Pick<District, 'name' | 'note' | 'sortOrder'> }) =>
      api.put<District>(`/api/masterdata/districts/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterdataKeys.districts }),
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Pick<Area, 'name' | 'status'> }) =>
      api.put<Area>(`/api/masterdata/areas/${id}`, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: masterdataKeys.areas });
      await qc.invalidateQueries({ queryKey: masterdataKeys.assignments });
    },
  });
}

export function useMoveArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, latitude, longitude }: { id: number; latitude: number; longitude: number }) =>
      api.put<Area>(`/api/masterdata/areas/${id}/location`, { latitude, longitude }),
    onSuccess: () => qc.invalidateQueries({ queryKey: masterdataKeys.areas }),
  });
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

export type MemberChange = components['schemas']['MemberChangeDto'];

/** Lịch sử đổi số nhân khẩu của một hộ, mới nhất trước. */
export function useMemberHistory(subjectId: number | null) {
  return useQuery({
    queryKey: [...masterdataKeys.subjects, 'member-history', subjectId],
    queryFn: () => api.get<MemberChange[]>(`/api/masterdata/subjects/${subjectId}/member-history`),
    enabled: subjectId !== null,
  });
}

export function useAreaHistory(areaId: number | null) {
  return useQuery({
    queryKey: [...masterdataKeys.assignments, 'history', areaId],
    queryFn: () => api.get<AreaAssignment[]>(`/api/masterdata/areas/${areaId}/assignments`),
    enabled: areaId !== null,
  });
}

function useCompanyMutation<V>(fn: (v: V) => Promise<Company>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: masterdataKeys.companies });
      await qc.invalidateQueries({ queryKey: masterdataKeys.assignments });
    },
  });
}

export function useCreateCompany() {
  return useCompanyMutation((body: CompanyRequest) => api.post<Company>('/api/masterdata/companies', body));
}

export function useUpdateCompany() {
  return useCompanyMutation(({ id, body }: { id: number; body: CompanyRequest }) =>
    api.put<Company>(`/api/masterdata/companies/${id}`, body),
  );
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

/** Gợi ý đường: danh mục nội bộ trước, Goong chỉ bổ sung tham khảo. {@code signal} để bỏ yêu cầu cũ khi đổi từ khóa. */
export function suggestStreets(q: string, districtId: number | undefined, signal?: AbortSignal) {
  return api.get<StreetSuggestions>('/api/masterdata/streets/suggest', { params: { q, districtId }, signal });
}

/** Hồ sơ nghi trùng địa chỉ (cùng tổ/ấp + đường + số nhà, kể cả đã ngừng). */
export function checkDuplicates(body: components['schemas']['DuplicateCheckRequest']) {
  return api.post<DuplicateSubject[]>('/api/masterdata/subjects/duplicate-check', body);
}

export function getSubject(id: number) {
  return api.get<Subject>(`/api/masterdata/subjects/${id}`);
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

/** Khớp ImportPreviewDto của backend (chưa có trong schema.d.ts cho tới lần `npm run gen:api` kế tiếp). */
export interface ImportRow {
  rowNo: number;
  type: string;
  name: string;
  houseNo: string | null;
  street: string;
  areaCode: string;
  phone: string;
  memberCount: number | null;
  errors: string[];
}

export interface ImportPreview {
  rows: ImportRow[];
  valid: number;
  invalid: number;
}

function fileForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}

export function usePreviewSubjectImport() {
  return useMutation({
    mutationFn: (file: File) => api.post<ImportPreview>('/api/masterdata/subjects/import/preview', fileForm(file)),
  });
}

export function useImportSubjects() {
  return useSubjectMutation((file: File) =>
    api.post<{ created: number }>('/api/masterdata/subjects/import', fileForm(file)),
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
