import { semantic } from '../app/theme';
import { formatMoney } from './format';

interface MoneyTextProps {
  value: number | null | undefined;
  strong?: boolean;
}

export function MoneyText({ value, strong = false }: MoneyTextProps) {
  const text = formatMoney(value);
  return <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: strong ? 600 : undefined }}>{text}</span>;
}

/** "Còn phải nộp": số âm (xã phải trả lại công ty) hiện "Xã trả lại công ty X đ", lấy đúng số sổ công ty–kỳ, không kẹp 0. */
export function RemainingText({ value, strong = false }: MoneyTextProps) {
  if (value !== null && value !== undefined && value < 0) {
    return (
      <span style={{ color: semantic.success.fg, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: strong ? 600 : undefined }}>
        Xã trả lại công ty {formatMoney(-value)}
      </span>
    );
  }
  return <MoneyText value={value} strong={strong} />;
}
