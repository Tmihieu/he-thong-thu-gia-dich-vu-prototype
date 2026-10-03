import { Tag } from 'antd';
import type { ReactNode } from 'react';

import { semantic } from '../app/theme';

/** Nhãn trạng thái theo màu ngữ nghĩa; luôn kèm chữ nên không chỉ dựa vào màu. */
export function StatusTag({ tone = 'neutral', children }: { tone?: keyof typeof semantic; children: ReactNode }) {
  const { fg, bg } = semantic[tone];
  return <Tag style={{ color: fg, background: bg, borderColor: bg }}>{children}</Tag>;
}
