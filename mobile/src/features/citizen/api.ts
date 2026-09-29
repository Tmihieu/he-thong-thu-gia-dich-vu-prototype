import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { components } from '../../api/schema';
import { completeRequest, requestIdFor } from '../payment/requestId';

type S = components['schemas'];
export type CitizenProfile = S['CitizenProfileDto'];
export type CitizenCharge = S['CitizenChargeDto'];
export type CitizenLoginResponse = S['CitizenLoginResponse'];
export type OtpRequestResponse = S['OtpRequestResponse'];
export type PaymentConfirmation = S['PaymentConfirmationDto'];
export type CitizenPaymentResponse = S['CitizenPaymentResponse'];
export type CitizenSchedule = S['CitizenScheduleDto'];
export type CitizenComplaint = S['CitizenComplaintDto'];
export type CitizenComplaintDetail = S['CitizenComplaintDetailDto'];
export type SubmitComplaintRequest = S['SubmitComplaintRequest'];
export type CitizenNotification = S['CitizenNotificationDto'];
export type CitizenNotificationPage = S['CitizenNotificationPageDto'];
export type NotificationKind = CitizenNotification['kind'];
export type BulkyRequest = S['BulkyRequestDto'];
export type CreateBulkyRequest = S['CreateBulkyRequest'];

export const citizenApi = {
  requestOtp: (phone: string) => api.post<OtpRequestResponse>('/api/citizen/auth/otp/request', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post<CitizenLoginResponse>('/api/citizen/auth/otp/verify', { phone, otp }),
  me: () => api.get<CitizenProfile>('/api/citizen/me'),
  charges: () => api.get<CitizenCharge[]>('/api/citizen/charges'),
  charge: (id: number) => api.get<CitizenCharge>(`/api/citizen/charges/${id}`),
  pay: (chargeId: number, amount: number, clientRequestId: string) =>
    api.post<CitizenPaymentResponse>('/api/citizen/payments', { chargeId, amount, clientRequestId }),
  confirmations: () => api.get<PaymentConfirmation[]>('/api/citizen/payments'),
  confirmation: (id: number) => api.get<PaymentConfirmation>(`/api/citizen/payments/${id}/confirmation`),
  schedule: () => api.get<CitizenSchedule>('/api/citizen/schedule'),
  complaints: () => api.get<CitizenComplaint[]>('/api/citizen/complaints'),
  complaint: (id: number) => api.get<CitizenComplaintDetail>(`/api/citizen/complaints/${id}`),
  submitComplaint: (body: SubmitComplaintRequest) => api.post<CitizenComplaintDetail>('/api/citizen/complaints', body),
  notifications: (kind?: NotificationKind) =>
    api.get<CitizenNotificationPage>('/api/citizen/notifications', { params: { kind, size: 100 } }),
  unreadCount: () => api.get<{ unreadCount: number }>('/api/citizen/notifications/unread-count'),
  markRead: (id: number) => api.post<CitizenNotification>(`/api/citizen/notifications/${id}/read`),
  markAllRead: () => api.post<{ unreadCount: number }>('/api/citizen/notifications/read-all'),
  bulkyRequests: () => api.get<BulkyRequest[]>('/api/citizen/bulky-requests'),
  bulkyRequest: (id: number) => api.get<BulkyRequest>(`/api/citizen/bulky-requests/${id}`),
  createBulky: (body: CreateBulkyRequest) => api.post<BulkyRequest>('/api/citizen/bulky-requests', body),
  cancelBulky: (id: number, reason: string) => api.post<BulkyRequest>(`/api/citizen/bulky-requests/${id}/cancel`, { reason }),
};

export const citizenKeys = {
  me: ['citizen', 'me'] as const,
  charges: ['citizen', 'charges'] as const,
  charge: (id: number) => ['citizen', 'charges', id] as const,
  confirmations: ['citizen', 'confirmations'] as const,
  confirmation: (id: number) => ['citizen', 'confirmations', id] as const,
  schedule: ['citizen', 'schedule'] as const,
  complaints: ['citizen', 'complaints'] as const,
  complaint: (id: number) => ['citizen', 'complaints', id] as const,
  notifications: (kind?: NotificationKind) => ['citizen', 'notifications', kind ?? 'ALL'] as const,
  unreadCount: ['citizen', 'notifications', 'unread-count'] as const,
  bulky: ['citizen', 'bulky'] as const,
  bulkyOne: (id: number) => ['citizen', 'bulky', id] as const,
};

/** Không có push thật: tab Thông báo và badge poll theo chu kỳ này (SPEC §9.7). */
export const NOTIFICATION_POLL_MS = 30_000;

export function useProfile() {
  return useQuery({ queryKey: citizenKeys.me, queryFn: citizenApi.me, staleTime: 5 * 60_000 });
}

export function useCharges() {
  return useQuery({ queryKey: citizenKeys.charges, queryFn: citizenApi.charges });
}

export function useCharge(id: number) {
  return useQuery({ queryKey: citizenKeys.charge(id), queryFn: () => citizenApi.charge(id), enabled: Number.isFinite(id) });
}

export function useConfirmations() {
  return useQuery({ queryKey: citizenKeys.confirmations, queryFn: citizenApi.confirmations });
}

export function useConfirmation(id: number) {
  return useQuery({
    queryKey: citizenKeys.confirmation(id),
    queryFn: () => citizenApi.confirmation(id),
    enabled: Number.isFinite(id),
  });
}

export function useSchedule() {
  return useQuery({ queryKey: citizenKeys.schedule, queryFn: citizenApi.schedule, staleTime: 10 * 60_000 });
}

export function useComplaints() {
  return useQuery({ queryKey: citizenKeys.complaints, queryFn: citizenApi.complaints });
}

/** Chi tiết phản ánh; poll 30 giây để timeline theo kịp xã / công ty (không có push thật). */
export function useComplaint(id: number) {
  return useQuery({
    queryKey: citizenKeys.complaint(id),
    queryFn: () => citizenApi.complaint(id),
    enabled: Number.isFinite(id),
    refetchInterval: 30_000,
  });
}

export function useSubmitComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: citizenApi.submitComplaint,
    onSuccess: (detail) => {
      queryClient.setQueryData(citizenKeys.complaint(detail.complaint.id), detail);
      void queryClient.invalidateQueries({ queryKey: citizenKeys.complaints });
    },
  });
}

export function useBulkyRequests() {
  return useQuery({ queryKey: citizenKeys.bulky, queryFn: citizenApi.bulkyRequests });
}

/** Chi tiết yêu cầu; poll 30 giây để thấy công ty báo phí / thu gom (không có push thật). */
export function useBulkyRequest(id: number) {
  return useQuery({
    queryKey: citizenKeys.bulkyOne(id),
    queryFn: () => citizenApi.bulkyRequest(id),
    enabled: Number.isFinite(id),
    // Đã thu gom / đã hủy thì không còn gì để chờ.
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' || q.state.data?.status === 'QUOTED' ? 30_000 : false),
  });
}

function useBulkyMutation<V>(fn: (v: V) => Promise<BulkyRequest>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      queryClient.setQueryData(citizenKeys.bulkyOne(r.id), r);
      void queryClient.invalidateQueries({ queryKey: citizenKeys.bulky, exact: true });
    },
    // Lỗi thường do công ty vừa đổi trạng thái: tải lại để thẻ thao tác không còn hiện sai.
    onError: () => void queryClient.invalidateQueries({ queryKey: citizenKeys.bulky }),
  });
}

export function useCreateBulky() {
  return useBulkyMutation(citizenApi.createBulky);
}

export function useCancelBulky(id: number) {
  return useBulkyMutation((reason: string) => citizenApi.cancelBulky(id, reason));
}

export function useNotifications(kind?: NotificationKind) {
  return useQuery({
    queryKey: citizenKeys.notifications(kind),
    queryFn: () => citizenApi.notifications(kind),
    refetchInterval: NOTIFICATION_POLL_MS,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: citizenKeys.unreadCount,
    queryFn: citizenApi.unreadCount,
    refetchInterval: NOTIFICATION_POLL_MS,
    select: (d) => d.unreadCount,
  });
}

function useRefreshNotifications() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['citizen', 'notifications'] });
  };
}

export function useMarkRead() {
  const refresh = useRefreshNotifications();
  return useMutation({ mutationFn: citizenApi.markRead, onSuccess: refresh });
}

export function useMarkAllRead() {
  const refresh = useRefreshNotifications();
  return useMutation({ mutationFn: citizenApi.markAllRead, onSuccess: refresh });
}

/**
 * Thanh toán mô phỏng: `clientRequestId` giữ theo khoản tới khi thành công, nên bấm lại khi mạng chậm
 * không tạo thanh toán thứ hai. Thành công thì làm mới khoản và danh sách xác nhận.
 */
export function usePay(chargeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => citizenApi.pay(chargeId, amount, requestIdFor(chargeId)),
    onSuccess: (res) => {
      completeRequest(chargeId);
      queryClient.setQueryData(citizenKeys.confirmation(res.confirmation.id), res.confirmation);
      void queryClient.invalidateQueries({ queryKey: citizenKeys.charges });
      void queryClient.invalidateQueries({ queryKey: citizenKeys.confirmations });
    },
  });
}

/** Khoản chưa đóng, hạn gần nhất trước; tổng còn phải đóng. */
export function summarizeCharges(charges: CitizenCharge[] | undefined) {
  const unpaid = (charges ?? []).filter((c) => c.status === 'UNPAID').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const history = (charges ?? []).filter((c) => c.status !== 'UNPAID');
  const totalRemaining = unpaid.reduce((sum, c) => sum + c.remainingAmount, 0);
  const overdueCount = unpaid.filter((c) => c.overdue).length;
  return { unpaid, history, totalRemaining, overdueCount, next: unpaid[0] ?? null };
}
