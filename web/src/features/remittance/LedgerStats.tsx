import { StatCard, StatGrid } from '../../shared/StatCard';
import { MoneyText } from '../../shared/MoneyText';
import type { semantic } from '../../app/theme';
import type { LedgerRow } from './api';

type Key = 'due' | 'collected' | 'retained' | 'payable' | 'received' | 'remaining' | 'previousDebt';
const STATS: Record<Key, [string, keyof typeof semantic]> = {
  due: ['Phải thu', 'neutral'],
  collected: ['Đã thu', 'info'],
  retained: ['Phí thu gom công ty hưởng', 'neutral'],
  payable: ['Phải nộp xã', 'info'],
  received: ['Đã nộp về xã', 'success'],
  remaining: ['Còn phải nộp', 'warning'],
  previousDebt: ['Nợ kỳ trước', 'danger'],
};
const DEFAULT_KEYS: Key[] = ['retained', 'payable', 'received', 'remaining'];

/** Hàng thẻ tổng của các dòng sổ công ty–kỳ (cộng thẳng số backend trả; công ty chỉ nhận dòng của mình). */
export function LedgerStats({ rows, show = DEFAULT_KEYS }: { rows: LedgerRow[]; show?: Key[] }) {
  return (
    <StatGrid>
      {show.map((key) => {
        const total = rows.reduce((t, r) => t + r[key], 0);
        return (
          <StatCard
            key={key}
            label={STATS[key][0]}
            tone={key === 'previousDebt' && total === 0 ? 'neutral' : STATS[key][1]}
            value={<MoneyText value={total} />}
          />
        );
      })}
    </StatGrid>
  );
}
