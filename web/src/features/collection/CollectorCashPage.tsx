import { List, Typography } from 'antd';

import { DateText } from '../../shared/DateText';
import { MoneyText } from '../../shared/MoneyText';
import { StatCard, StatGrid } from '../../shared/StatCard';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../shared/StateBlock';
import { type Handover, useCashHeld, useHandovers } from './api';

/** Tiền mặt của người đi thu: đang giữ (đã thu − đã bàn giao, G5) và lịch sử bàn giao cho công ty. */
export function CollectorCashPage() {
  const cash = useCashHeld();
  const handovers = useHandovers();
  const mine = cash.data?.[0];
  const error = cash.error ?? handovers.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <ErrorBlock error={error} />}
      {cash.isLoading ? (
        <LoadingBlock rows={2} />
      ) : (
        <StatGrid>
          <StatCard label="Tiền mặt đang giữ" tone={(mine?.held ?? 0) > 0 ? 'warning' : 'success'} value={<MoneyText value={mine?.held ?? 0} />} hint="Nhớ nộp lại cho công ty" />
          <StatCard label="Đã thu tiền mặt" value={<MoneyText value={mine?.collectedCash ?? 0} />} />
          <StatCard label="Đã bàn giao công ty" tone="success" value={<MoneyText value={mine?.handedOver ?? 0} />} />
        </StatGrid>
      )}
      <Typography.Title level={4} style={{ margin: 0 }}>
        Lịch sử bàn giao
      </Typography.Title>
      <List<Handover>
        loading={handovers.isLoading}
        dataSource={handovers.data ?? []}
        rowKey="id"
        locale={{ emptyText: <EmptyBlock title="Chưa bàn giao lần nào" hint="Khi nộp tiền mặt cho quản lý công ty, lần bàn giao hiện ở đây." /> }}
        renderItem={(h) => (
          <List.Item extra={<MoneyText value={h.amount} strong />}>
            <List.Item.Meta title={h.code} description={<DateText value={h.handoverDate} />} />
          </List.Item>
        )}
      />
    </div>
  );
}
