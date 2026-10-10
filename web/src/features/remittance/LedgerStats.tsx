import { StatCard, StatGrid } from '../../shared/StatCard';
import { MoneyText } from '../../shared/MoneyText';
import type { semantic } from '../../app/theme';
import type { LedgerRow } from './api';

type Key = 'due' | 'collected' | 'retained' | 'payable' | 'received' | 'remaining' | 'previousDebt';
const STATS: Record<Key, [string, keyof typeof semantic]> = {
  due: ['Phải thu', 'neutral'],
  collected: ['Đã thu', 'info'],
  retained: ['Số tiền công ty giữ lại', 'neutral'],
  payable: ['Số tiền phải nộp xã', 'info'],
  received: ['Đã nộp về xã', 'success'],
  remaining: ['Còn phải nộp', 'warning'],
  previousDebt: ['Nợ tồn đọng', 'danger'],
};
const DEFAULT_KEYS: Key[] = ['retained', 'payable', 'received', 'remaining'];

export function LedgerStats({
  rows,
  show = DEFAULT_KEYS,
  labels,
}: {
  rows: LedgerRow[];
  show?: Key[];
  labels?: Partial<Record<Key, string>>;
}) {
  return (
    <StatGrid>
      {show.map((key) => {
        const total = rows.reduce((t, r) => t + r[key], 0);
        return (
          <StatCard
            key={key}
            label={labels?.[key] ?? STATS[key][0]}
            tone={key === 'previousDebt' && total === 0 ? 'neutral' : STATS[key][1]}
            value={<MoneyText value={total} />}
          />
        );
      })}
    </StatGrid>
  );
}
