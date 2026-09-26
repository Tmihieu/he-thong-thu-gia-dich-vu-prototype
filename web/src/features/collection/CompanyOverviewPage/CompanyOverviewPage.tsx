import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Col, Descriptions, Progress, Row, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { api, ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { PROGRESS_COLORS, PROGRESS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { remittanceKeys, useCompanyLedger } from '../../remittance/api';
import { type CashHeld, collectionKeys, type Handover, useCashHeld, useHandovers } from '../api';
import { CashReceiveForm, type CashReceiveRequest } from './CashReceiveForm';

function errorText(e: unknown) {
  return e ? (e instanceof ApiError ? e.message : 'Không thực hiện được. Vui lòng thử lại.') : null;
}

/**
 * Tổng quan của công ty: vòng tiến độ lấy nguyên dòng công ty trong sổ công ty–kỳ (T24, không tự tính lại);
 * người đi thu và tiền mặt đang giữ; nhận tiền mặt (G5); lịch sử bàn giao.
 */
export function CompanyOverviewPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [periodId, setPeriodId] = useState<number>();
  const [receiving, setReceiving] = useState<CashHeld | null>(null);
  const ledger = useCompanyLedger(periodId);
  const cash = useCashHeld();
  const handovers = useHandovers();
  const receive = useMutation({
    mutationFn: (req: CashReceiveRequest) => api.post<Handover>('/api/collection/cash/handovers', req),
    onSuccess: (h) => {
      message.success(`Đã nhận ${h.code} từ ${h.collectorName}`);
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      void queryClient.invalidateQueries({ queryKey: remittanceKeys.ledger });
      setReceiving(null);
    },
  });
  const row = ledger.data?.[0];
  const loadError = ledger.error ?? cash.error ?? handovers.error;

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
      </Space>
      {loadError && <Alert type="error" showIcon message={errorText(loadError)} style={{ marginBottom: 12 }} />}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={10}>
          <Card size="small" title="Tiến độ thu kỳ" loading={ledger.isLoading}>
            {row ? (
              <Space size="large" align="center" wrap>
                <Progress
                  type="circle"
                  percent={row.collectionRate}
                  status={row.lowCollectionRate ? 'exception' : 'normal'}
                  format={(p) => `${(p ?? 0).toLocaleString('vi-VN')}%`}
                />
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="Đã thu">
                    <MoneyText value={row.collected} strong />
                  </Descriptions.Item>
                  <Descriptions.Item label="Phải thu">
                    <MoneyText value={row.due} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Đã nộp về xã">
                    <MoneyText value={row.received} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Còn phải nộp">
                    <MoneyText value={row.remaining} />
                  </Descriptions.Item>
                  {row.previousDebt > 0 && (
                    <Descriptions.Item label="Nợ kỳ trước">
                      <Typography.Text type="danger">
                        <MoneyText value={row.previousDebt} />
                      </Typography.Text>
                    </Descriptions.Item>
                  )}
                </Descriptions>
                <Tag color={PROGRESS_COLORS[row.progress]}>{PROGRESS_LABELS[row.progress]}</Tag>
              </Space>
            ) : (
              <Typography.Text type="secondary">Kỳ này công ty chưa có khoản phải thu</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card size="small" title="Người đi thu · tiền mặt">
            <Table<CashHeld>
              size="small"
              rowKey="collectorId"
              loading={cash.isLoading}
              dataSource={cash.data ?? []}
              pagination={false}
              locale={{ emptyText: 'Công ty chưa có người đi thu' }}
              columns={[
                { title: 'Người đi thu', render: (_, c) => `${c.collectorName} · ${c.collectorUsername}` },
                { title: 'Đã thu tiền mặt', dataIndex: 'collectedCash', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                { title: 'Đã bàn giao', dataIndex: 'handedOver', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                { title: 'Đang giữ', dataIndex: 'held', align: 'right', render: (v: number) => <MoneyText value={v} strong /> },
                {
                  title: '',
                  render: (_, c) => (
                    <Button size="small" disabled={c.held <= 0} onClick={() => setReceiving(c)} aria-label={`Nhận tiền mặt ${c.collectorName}`}>
                      Nhận tiền mặt
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Lịch sử bàn giao
      </Typography.Title>
      <Table<Handover>
        size="small"
        rowKey="id"
        loading={handovers.isLoading}
        dataSource={handovers.data ?? []}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'Chưa nhận tiền mặt lần nào' }}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Ngày', dataIndex: 'handoverDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Người đi thu', dataIndex: 'collectorName' },
          { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Ghi chú', dataIndex: 'note', render: (v: string | null) => v ?? '—' },
        ]}
      />
      <CashReceiveForm
        collector={receiving}
        submitting={receive.isPending}
        error={errorText(receive.error)}
        onCancel={() => {
          setReceiving(null);
          receive.reset();
        }}
        onSubmit={(req) => receive.mutate(req)}
      />
    </>
  );
}
