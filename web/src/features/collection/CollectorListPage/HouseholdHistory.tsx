import { Drawer, Timeline, Typography } from 'antd';

import { formatDate, formatMoney } from '../../../shared/format';
import { PAYMENT_METHOD_LABELS } from '../../../shared/labels';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../../shared/StateBlock';
import { type CollectorCharge, type HistoryEntry, useChargeHistory, type Visit } from '../api';
import { RESULT_LABELS } from '../workState';

const VISIT_COLORS: Record<Visit['result'], string> = {
  ABSENT: 'gold',
  APPOINTMENT: 'blue',
  REFUSED: 'red',
};

function entryItem(e: HistoryEntry) {
  const when = formatDate(e.at, true);
  if (e.payment) {
    const p = e.payment;
    return {
      key: `payment-${p.id}`,
      color: 'green',
      children: (
        <>
          <Typography.Text strong>{p.method === 'REFUND' ? `Đã hoàn ${formatMoney(Math.abs(p.amount))}` : `Đã thu ${formatMoney(p.amount)}`}</Typography.Text>
          <Typography.Text type="secondary">
            {' '}
            · {PAYMENT_METHOD_LABELS[p.method]} · {when}
          </Typography.Text>
          <div>
            {p.code}
            {p.note ? ` · ${p.note}` : ''}
          </div>
        </>
      ),
    };
  }
  const v = e.visit;
  return {
    key: `visit-${v.id}`,
    color: VISIT_COLORS[v.result],
    children: (
      <>
        <Typography.Text strong>{RESULT_LABELS[v.result]}</Typography.Text>
        <Typography.Text type="secondary"> · {when}</Typography.Text>
        {v.revisitDate && (
          <div>
            {v.result === 'APPOINTMENT' ? 'Ngày hẹn' : 'Ngày quay lại'} {formatDate(v.revisitDate)}
          </div>
        )}
        {v.note && <div>{v.note}</div>}
      </>
    ),
  };
}

interface Props {
  item: CollectorCharge | null;
  onClose: () => void;
}

/** Bottom sheet lịch sử hộ trên khoản đang xem: các lần thu và lượt ghé, cũ trước. */
export function HouseholdHistory({ item, onClose }: Props) {
  const history = useChargeHistory(item?.charge.id);
  const entries = history.data ?? [];

  return (
    <Drawer
      placement="bottom"
      height="auto"
      open={item !== null}
      onClose={onClose}
      title={item ? `Lịch sử · ${item.charge.subjectName}` : 'Lịch sử hộ'}
      destroyOnHidden
      styles={{ body: { paddingBottom: 24 } }}
    >
      {item && (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          {item.charge.subjectCode} · phải thu {formatMoney(item.charge.amount)} · đã thu {formatMoney(item.paidAmount)}
        </Typography.Paragraph>
      )}
      {history.error ? (
        <ErrorBlock error={history.error} onRetry={() => void history.refetch()} />
      ) : history.isLoading ? (
        <LoadingBlock rows={3} />
      ) : entries.length === 0 ? (
        <EmptyBlock title="Chưa có lần thu hay lượt ghé nào" />
      ) : (
        <Timeline items={entries.map(entryItem)} />
      )}
    </Drawer>
  );
}
