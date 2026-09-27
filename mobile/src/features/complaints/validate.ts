import type { ComplaintCategory } from '../../shared/labels';

export interface ComplaintDraft {
  category: ComplaintCategory | null;
  content: string;
  location: string;
}

export type ComplaintErrors = Partial<Record<keyof ComplaintDraft, string>>;

export const CONTENT_MAX = 4000;
export const LOCATION_MAX = 100;

/** Kiểm tra form gửi phản ánh trước khi gọi API (backend kiểm lại: `SubmitComplaintRequest`). */
export function validateComplaint(draft: ComplaintDraft): ComplaintErrors {
  const errors: ComplaintErrors = {};
  if (!draft.category) errors.category = 'Chọn loại phản ánh.';
  const content = draft.content.trim();
  if (!content) errors.content = 'Nhập nội dung phản ánh.';
  else if (content.length > CONTENT_MAX) errors.content = `Nội dung tối đa ${CONTENT_MAX} ký tự.`;
  if (draft.location.trim().length > LOCATION_MAX) errors.location = `Địa điểm tối đa ${LOCATION_MAX} ký tự.`;
  return errors;
}
