import { ApiError } from '../api/client';

/** Thông báo lỗi hiển thị: ưu tiên `message` tiếng Việt của backend (BR-GEN-05), không thì câu dự phòng. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Lỗi do không tới được máy chủ (mất mạng, sai địa chỉ), không phải lỗi nghiệp vụ. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'NETWORK_ERROR' || error.code === 'API_URL_MISSING');
}
