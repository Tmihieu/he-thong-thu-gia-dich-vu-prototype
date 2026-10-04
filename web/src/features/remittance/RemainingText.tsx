import { MoneyText } from '../../shared/MoneyText';
import { StatusTag } from '../../shared/StatusTag';

/** Còn phải nộp; số âm là công ty nộp thừa (QĐ-L12) nên hiện "Nộp thừa X đ" thay vì số âm. */
export function RemainingText({ value, strong = false }: { value: number; strong?: boolean }) {
  if (value < 0) {
    return (
      <StatusTag tone="warning">
        Nộp thừa <MoneyText value={-value} />
      </StatusTag>
    );
  }
  return <MoneyText value={value} strong={strong} />;
}
