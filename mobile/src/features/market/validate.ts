import type { MarketPostType } from '../../shared/labels';

export interface MarketDraft {
  title: string;
  postType: MarketPostType | null;
  description: string;
  pickupLocation: string;
}

export type MarketErrors = Partial<Record<keyof MarketDraft, string>>;

export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 2000;
export const PICKUP_MAX = 255;
export const COMMENT_MAX = 1000;

/**
 * Kiểm tra form đăng bài trước khi gọi API (backend kiểm lại: `CreateMarketPostRequest`). Mô tả bắt buộc theo data
 * dictionary và backend; nơi nhận và ảnh không bắt buộc.
 */
export function validateMarketPost(draft: MarketDraft): MarketErrors {
  const errors: MarketErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'Nhập tên vật dụng.';
  else if (title.length > TITLE_MAX) errors.title = `Tên vật dụng tối đa ${TITLE_MAX} ký tự.`;
  if (!draft.postType) errors.postType = 'Chọn hình thức: cho tặng hoặc trao đổi.';
  const description = draft.description.trim();
  if (!description) errors.description = 'Nhập mô tả tình trạng.';
  else if (description.length > DESCRIPTION_MAX) errors.description = `Mô tả tối đa ${DESCRIPTION_MAX} ký tự.`;
  if (draft.pickupLocation.trim().length > PICKUP_MAX) errors.pickupLocation = `Địa điểm nhận tối đa ${PICKUP_MAX} ký tự.`;
  return errors;
}
