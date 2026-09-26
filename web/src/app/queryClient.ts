import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '../api/client';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Lỗi 4xx (quyền, không tìm thấy, quy tắc) thử lại cũng vô ích.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}
