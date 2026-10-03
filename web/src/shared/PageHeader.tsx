import { Typography } from 'antd';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** Một câu giải thích màn dùng để làm gì (chữ phụ, tối đa ~80 ký tự). */
  description?: ReactNode;
  /** Nút / bộ lọc chính của màn, căn phải. */
  extra?: ReactNode;
}

/** Tiêu đề trang thống nhất: h1 + mô tả + nút chính. Mọi màn bên trong khung chung dùng thay cho `Typography.Title`. */
export function PageHeader({ title, description, extra }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <Typography.Title level={1} className="page-title">
          {title}
        </Typography.Title>
        {description && <Typography.Paragraph type="secondary" className="page-description">{description}</Typography.Paragraph>}
      </div>
      {extra && <div className="page-header-extra">{extra}</div>}
    </header>
  );
}
