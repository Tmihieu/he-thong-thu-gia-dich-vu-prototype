import { Tag } from 'antd';
import type { ReactNode } from 'react';

import { semantic } from '../app/theme';

type Tone = keyof typeof semantic;

/** Tên màu antd cũ (trong `labels.ts`) → màu ngữ nghĩa, để các bảng nhãn hiện có dùng được mà không đổi. */
const COLOR_TONE: Record<string, Tone> = {
  green: 'success', success: 'success', cyan: 'success', lime: 'success',
  red: 'danger', error: 'danger', volcano: 'danger', magenta: 'danger',
  orange: 'warning', gold: 'warning', warning: 'warning', yellow: 'warning',
  blue: 'info', geekblue: 'info', processing: 'info', purple: 'info',
};

interface StatusTagProps {
  tone?: Tone;
  /** Tên màu antd cũ; ưu tiên `tone` khi có cả hai. */
  color?: string;
  children: ReactNode;
}

/** Nhãn trạng thái theo màu ngữ nghĩa; luôn kèm chữ nên không chỉ dựa vào màu. */
export function StatusTag({ tone, color, children }: StatusTagProps) {
  const { fg, bg } = semantic[tone ?? (color ? COLOR_TONE[color] : undefined) ?? 'neutral'];
  return <Tag style={{ color: fg, background: bg, borderColor: bg }}>{children}</Tag>;
}
