import { formatMoney } from './format';

interface MoneyTextProps {
  value: number | null | undefined;
  strong?: boolean;
}

export function MoneyText({ value, strong = false }: MoneyTextProps) {
  const text = formatMoney(value);
  return <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: strong ? 600 : undefined }}>{text}</span>;
}
