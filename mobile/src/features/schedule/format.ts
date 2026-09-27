import { WEEKDAY_LABELS } from '../../shared/labels';

const WEEK_OF_MONTH: Record<number, string> = { 1: 'đầu tháng', 2: 'thứ hai của tháng', 3: 'thứ ba của tháng', 4: 'thứ tư của tháng', 5: 'cuối tháng' };

/** "17:00:00" → "17:00". */
export function formatTime(value: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(value);
  return m ? `${m[1]}:${m[2]}` : value;
}

/** "17:00:00", "19:00:00" → "17:00 – 19:00". */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** (7, 1) → "Chủ nhật đầu tháng"; (2, null) → "Thứ 3". */
export function scheduleDayLabel(weekday: number, weekOfMonth: number | null | undefined): string {
  const day = WEEKDAY_LABELS[weekday] ?? `Thứ ${weekday}`;
  const week = weekOfMonth ? WEEK_OF_MONTH[weekOfMonth] : null;
  return week ? `${day} ${week}` : day;
}
