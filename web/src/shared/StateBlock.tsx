import { InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Skeleton } from 'antd';
import type { ReactNode } from 'react';

import { errorText } from './errorText';

/** Đang tải: khung xương cùng hình dạng danh sách, không dùng vòng xoay giữa trang trống. */
export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="state-block" role="status" aria-busy="true" aria-label="Đang tải dữ liệu">
      <Skeleton active title={false} paragraph={{ rows, width: '100%' }} />
    </div>
  );
}

/** Trống: nói rõ vì sao trống và việc nên làm tiếp (`action`). */
export function EmptyBlock({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state-block state-empty" role="status">
      <InboxOutlined className="state-icon" aria-hidden="true" />
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

/** Lỗi: hiện đúng message của backend, kèm nút "Thử lại" khi có `onRetry`. */
export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="state-block state-error" role="alert">
      <WarningOutlined className="state-icon" aria-hidden="true" />
      <strong>Không tải được dữ liệu</strong>
      <p>{errorText(error)}</p>
      {onRetry && <Button onClick={onRetry}>Thử lại</Button>}
    </div>
  );
}
