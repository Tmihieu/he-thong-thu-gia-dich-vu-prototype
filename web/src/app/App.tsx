import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { createBrowserRouter, RouterProvider } from 'react-router';

import { ApiError } from '../api/client';
import { HomePage } from './HomePage';

dayjs.locale('vi');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lỗi 4xx (quyền, không tìm thấy, quy tắc) thử lại cũng vô ích.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Layout và menu theo vai trò được thêm ở T08.
const router = createBrowserRouter([{ path: '/', element: <HomePage /> }]);

export function App() {
  return (
    <ConfigProvider locale={viVN}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}
