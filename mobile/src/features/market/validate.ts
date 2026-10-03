import type { MarketTag } from '../../shared/labels';
import { validatePhone } from '../auth/validate';

export interface MarketDraft {
  caption: string;
  tags: MarketTag[];
  sharePhone: boolean;
  contactPhone: string;
}

export type MarketErrors = Partial<Record<'caption' | 'tags' | 'contactPhone', string>>;

export const CAPTION_MAX = 2500;
export const TAGS_MAX = 4;
export const COMMENT_MAX = 1000;

/** Kiểm form đăng/sửa trước khi gọi API (backend kiểm lại, spec §4.1). */
export function validateMarketPost(d: MarketDraft): MarketErrors {
  const errors: MarketErrors = {};
  const caption = d.caption.trim();
  if (!caption) errors.caption = 'Nhập nội dung bài đăng.';
  else if (caption.length > CAPTION_MAX) errors.caption = `Nội dung tối đa ${CAPTION_MAX} ký tự.`;
  if (d.tags.length === 0) errors.tags = 'Chọn ít nhất một nhãn.';
  else if (d.tags.length > TAGS_MAX) errors.tags = `Chọn tối đa ${TAGS_MAX} nhãn.`;
  if (d.sharePhone) {
    const phone = validatePhone(d.contactPhone);
    if (phone) errors.contactPhone = phone;
  }
  return errors;
}
