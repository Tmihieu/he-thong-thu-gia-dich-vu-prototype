import { router } from 'expo-router';

import { formatDate, formatMoney } from '../../shared/format';
import { BULKY_ITEM_LABELS, BULKY_STATUS_LABELS, type BulkyStatus } from '../../shared/labels';
import { ListRow, Tag, type Tone } from '../../shared/ui';
import type { BulkyRequest } from '../citizen/api';

export const BULKY_TONES: Record<BulkyStatus, Tone> = {
  PENDING: 'warning',
  QUOTED: 'info',
  COLLECTED: 'success',
  CANCELLED: 'neutral',
};

/** Ngày hiển thị: ngày hẹn nếu công ty đã báo phí, còn không là ngày hộ mong muốn. */
export function bulkyDateText(r: BulkyRequest): string {
  return r.scheduledDate ? `Hẹn ${formatDate(r.scheduledDate)}` : `Mong muốn ${formatDate(r.preferredDate)}`;
}

/** Một yêu cầu rác cồng kềnh, đặt trong `ListGroup`. */
export function BulkyRow({ r }: { r: BulkyRequest }) {
  return (
    <ListRow
      icon="cube-outline"
      title={`${r.quantity} × ${BULKY_ITEM_LABELS[r.itemType]}`}
      subtitle={`${bulkyDateText(r)}. Phí: ${r.quotedFee !== null ? formatMoney(r.quotedFee) : 'chờ công ty báo'}`}
      right={<Tag tone={BULKY_TONES[r.status]}>{BULKY_STATUS_LABELS[r.status]}</Tag>}
      onPress={() => router.push({ pathname: '/bulky/[id]', params: { id: String(r.id) } })}
    />
  );
}
