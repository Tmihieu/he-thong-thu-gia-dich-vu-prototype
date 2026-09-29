import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';

export type Approval = components['schemas']['ApprovalDto'];
export type ApprovalType = Approval['type'];
export type ApprovalStatus = Approval['status'];
export type CreateApprovalRequest = components['schemas']['CreateApprovalRequest'];

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  EXEMPTION: 'Miễn giảm',
  REFUND: 'Hoàn tiền',
  WRITE_OFF: 'Xóa nợ',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  PENDING: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
};

export const approvalKeys = { all: ['leadership', 'approvals'] as const };

export function useApprovals(status?: ApprovalStatus, type?: ApprovalType) {
  return useQuery({
    queryKey: [...approvalKeys.all, status, type],
    queryFn: () => api.get<Approval[]>('/api/leadership/approvals', { params: { status, type } }),
  });
}

/** Duyệt / từ chối / lập đề nghị làm đổi số liệu tiền: tải lại mọi thứ (sổ công ty–kỳ, khoản, danh sách thu). */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

export function useCreateApproval() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: CreateApprovalRequest) => api.post<Approval>('/api/leadership/approvals', body),
    onSuccess: invalidate,
  });
}

export function useDecideApproval() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: number; approve: boolean; note?: string }) =>
      api.post<Approval>(`/api/leadership/approvals/${id}/${approve ? 'approve' : 'reject'}`, { note }),
    onSuccess: invalidate,
  });
}
