import { ApiError } from '../api/client';

/** Câu lỗi hiển thị cho người dùng: ưu tiên `message` tiếng Việt của backend (BR-GEN-05). */
export function errorText(err: unknown, fallback = 'Không thể thực hiện. Vui lòng thử lại.'): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Như {@link errorText} nhưng không lỗi thì trả null (dùng cho `error={...}` của form / Alert). */
export function errorTextOrNull(err: unknown, fallback?: string): string | null {
  return err ? errorText(err, fallback) : null;
}
