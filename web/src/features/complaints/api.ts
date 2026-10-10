import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type Complaint = components['schemas']['ComplaintDto'];
export type ComplaintDetail = components['schemas']['ComplaintDetailDto'];
export type ComplaintEvent = components['schemas']['EventDto'];
export type CreateComplaintRequest = components['schemas']['CreateComplaintRequest'];
export type ComplaintStatus = Complaint['status'];

export const complaintKeys = {
  all: ['complaints'] as const,
  list: ['complaints', 'list'] as const,
  detail: ['complaints', 'detail'] as const,
};

/** Danh sách khiếu nại theo phạm vi người gọi (công ty: chỉ khiếu nại đã chuyển cho mình, G12). */
export function useComplaints() {
  return useQuery({ queryKey: complaintKeys.list, queryFn: () => api.get<Complaint[]>('/api/complaints') });
}

export function useComplaint(id: number | null) {
  return useQuery({
    queryKey: [...complaintKeys.detail, id],
    queryFn: () => api.get<ComplaintDetail>(`/api/complaints/${id}`),
    enabled: id !== null,
  });
}

function useComplaintMutation<V, R = ComplaintDetail>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: complaintKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Tải một ảnh lên Cloudinary qua backend, nhận URL để gắn vào khiếu nại (`photoUrls`). */
export function useUploadComplaintPhoto() {
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return api.post<{ url: string }>('/api/complaints/photos', body);
    },
  });
}

export function useCreateComplaint() {
  return useComplaintMutation((body: CreateComplaintRequest) => api.post<ComplaintDetail>('/api/complaints', body));
}

export function useReturnComplaint() {
  return useComplaintMutation(({ id, reason }: { id: number; reason: string }) =>
    api.post<void>(`/api/complaints/${id}/return`, { reason }),
  );
}

export function useForwardComplaint() {
  return useComplaintMutation(({ id, ...body }: { id: number; companyId?: number; areaId?: number; note?: string }) =>
    api.post<ComplaintDetail>(`/api/complaints/${id}/forward`, body),
  );
}

export function useReplyComplaint() {
  return useComplaintMutation(({ id, content }: { id: number; content: string }) =>
    api.post<ComplaintDetail>(`/api/complaints/${id}/reply`, { content }),
  );
}

export function useCloseComplaint() {
  return useComplaintMutation(({ id, resolution }: { id: number; resolution: string }) =>
    api.post<ComplaintDetail>(`/api/complaints/${id}/close`, { resolution }),
  );
}
