import { Select } from 'antd';
import { useEffect } from 'react';

import { PERIOD_STATUS_LABELS } from '../../shared/labels';
import { usePeriods } from './api';

interface Props {
  value: number | undefined;
  onChange: (periodId: number | undefined) => void;
}

/** Chọn kỳ thu; lần đầu tự chọn kỳ mới nhất chưa khóa (hoặc kỳ mới nhất). */
export function PeriodSelect({ value, onChange }: Props) {
  const periods = usePeriods();

  useEffect(() => {
    if (value === undefined && periods.data && periods.data.length > 0) {
      const open = periods.data.find((p) => p.status !== 'LOCKED');
      onChange((open ?? periods.data[0])!.id);
    }
  }, [value, periods.data, onChange]);

  return (
    <Select
      aria-label="Kỳ thu"
      style={{ width: 240 }}
      loading={periods.isLoading}
      placeholder="Chọn kỳ"
      value={value}
      onChange={onChange}
      options={(periods.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.label} · ${PERIOD_STATUS_LABELS[p.status]}`,
      }))}
    />
  );
}
