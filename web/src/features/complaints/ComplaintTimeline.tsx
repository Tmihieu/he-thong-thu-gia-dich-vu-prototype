import { Timeline, Typography } from 'antd';

import { formatDate } from '../../shared/format';
import type { ComplaintEvent } from './api';
import { COMPLAINT_EVENT_LABELS } from './labels';

const COLORS: Record<ComplaintEvent['eventType'], string> = {
  SUBMITTED: 'gray',
  RECEIVED: 'blue',
  FORWARDED: 'orange',
  COMPANY_REPLIED: 'purple',
  CLOSED: 'green',
};

/** Timeline khiếu nại: các mốc nối tiếp, cũ trước (dùng chung màn xã và công ty). */
export function ComplaintTimeline({ events }: { events: ComplaintEvent[] }) {
  return (
    <Timeline
      items={events.map((e) => ({
        key: e.id,
        color: COLORS[e.eventType],
        children: (
          <>
            <Typography.Text strong>{COMPLAINT_EVENT_LABELS[e.eventType]}</Typography.Text>
            <Typography.Text type="secondary">
              {' '}
              · {e.actorLabel} · {formatDate(e.occurredAt, true)}
            </Typography.Text>
            <div style={{ whiteSpace: 'pre-line' }}>{e.content}</div>
          </>
        ),
      }))}
    />
  );
}
