import { formatDate } from './format';

interface DateTextProps {
  value: string | null | undefined;
  withTime?: boolean;
}

export function DateText({ value, withTime = false }: DateTextProps) {
  return <span>{formatDate(value, withTime)}</span>;
}
