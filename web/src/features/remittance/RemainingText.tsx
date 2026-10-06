import { MoneyText } from '../../shared/MoneyText';
import { StatusTag } from '../../shared/StatusTag';

/** Còn phải nộp; số âm là xã phải trả lại công ty (phải nộp xã tính trên đã thu, góp ý BA 05/10), hiện "Xã trả lại công ty X đ" thay vì số âm. */
export function RemainingText({ value, strong = false }: { value: number; strong?: boolean }) {
  if (value < 0) {
    return (
      <StatusTag tone="warning">
        Xã trả lại công ty <MoneyText value={-value} />
      </StatusTag>
    );
  }
  return <MoneyText value={value} strong={strong} />;
}
