import { router } from 'expo-router';

import { formatDate } from '../../shared/format';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '../../shared/labels';
import { ListRow, Tag, type Tone } from '../../shared/ui';
import type { CitizenComplaint } from '../citizen/api';

export function complaintTone(c: Pick<CitizenComplaint, 'status' | 'overdue'>): Tone {
  if (c.status === 'RESOLVED') return 'success';
  if (c.overdue) return 'danger';
  return c.status === 'PROCESSING' ? 'info' : 'warning';
}

export function complaintStatusLabel(c: Pick<CitizenComplaint, 'status' | 'overdue'>): string {
  return c.status !== 'RESOLVED' && c.overdue ? 'Quá hạn xử lý' : COMPLAINT_STATUS_LABELS[c.status];
}

/** Một phản ánh trong danh sách / trang chủ, đặt trong `ListGroup`. */
export function ComplaintRow({ c }: { c: CitizenComplaint }) {
  return (
    <ListRow
      icon="chatbubble-ellipses-outline"
      title={COMPLAINT_CATEGORY_LABELS[c.category]}
      subtitle={`${c.code}, ${formatDate(c.receivedDate)}`}
      right={<Tag tone={complaintTone(c)}>{complaintStatusLabel(c)}</Tag>}
      onPress={() => router.push({ pathname: '/complaints/[id]', params: { id: String(c.id) } })}
    />
  );
}
