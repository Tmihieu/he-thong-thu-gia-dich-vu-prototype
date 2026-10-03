import type { ReactNode } from 'react';

import { semantic } from '../app/theme';

type Tone = keyof typeof semantic;

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Dòng chú thích dưới số (vd. "so với kỳ trước"). */
  hint?: ReactNode;
  /** Màu viền trái theo ngữ nghĩa; mặc định trung tính. */
  tone?: Tone;
}

/** Thẻ số liệu: nhãn nhỏ, số lớn dùng chữ số đều nhau, viền trái màu theo `tone`. */
export function StatCard({ label, value, hint, tone = 'neutral' }: StatCardProps) {
  return (
    <div className="stat-card" style={{ borderLeftColor: semantic[tone].fg }}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

/** Lưới các {@link StatCard}: tự xuống dòng theo bề rộng. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="stat-grid">{children}</div>;
}
