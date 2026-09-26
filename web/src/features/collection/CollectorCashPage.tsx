import { Alert, Card, Descriptions, List, Space, Statistic, Typography } from 'antd';

import { ApiError } from '../../api/client';
import { DateText } from '../../shared/DateText';
import { MoneyText } from '../../shared/MoneyText';
import { type Handover, useCashHeld, useHandovers } from './api';

/** Tiền mặt của người đi thu: đang giữ (đã thu − đã bàn giao, G5) và lịch sử bàn giao cho công ty. */
export function CollectorCashPage() {
  const cash = useCashHeld();
  const handovers = useHandovers();
  const mine = cash.data?.[0];
  const error = cash.error ?? handovers.error;

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {error && <Alert type="error" showIcon message={error instanceof ApiError ? error.message : 'Không tải được số liệu'} />}
      <Card size="small" loading={cash.isLoading}>
        <Statistic title="Tiền mặt đang giữ" value={mine?.held ?? 0} formatter={(v) => <MoneyText value={Number(v)} strong />} />
        <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
          <Descriptions.Item label="Đã thu tiền mặt">
            <MoneyText value={mine?.collectedCash ?? 0} />
          </Descriptions.Item>
          <Descriptions.Item label="Đã bàn giao công ty">
            <MoneyText value={mine?.handedOver ?? 0} />
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Typography.Title level={5} style={{ margin: 0 }}>
        Lịch sử bàn giao
      </Typography.Title>
      <List<Handover>
        loading={handovers.isLoading}
        dataSource={handovers.data ?? []}
        rowKey="id"
        locale={{ emptyText: 'Chưa bàn giao lần nào' }}
        renderItem={(h) => (
          <List.Item extra={<MoneyText value={h.amount} strong />}>
            <List.Item.Meta title={h.code} description={<DateText value={h.handoverDate} />} />
          </List.Item>
        )}
      />
    </Space>
  );
}
