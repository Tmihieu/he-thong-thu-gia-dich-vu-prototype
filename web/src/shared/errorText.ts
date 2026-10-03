import { ApiError } from '../api/client';

/** Câu lỗi hiển thị cho người dùng: ưu tiên `message` tiếng Việt của backend (BR-GEN-05). */
export function errorText(err: unknown, fallback = 'Không thể thực hiện. Vui lòng thử lại.'): string {
  return err instanceof ApiError ? err.message : fallback;
}
