import { Button, Space, Table } from 'antd';
import { useState } from 'react';

import { DateText } from '../../../shared/DateText';
import { RECEIPT_METHOD_LABELS, settlementDirection } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { EmptyBlock, ErrorBlock } from '../../../shared/StateBlock';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type Settlement, useSettlements } from '../api';
import { SettlementPrint } from './SettlementPrint';

/**
 * Phiếu quyết toán theo kỳ, mỗi công ty một phiếu (quyet-toan-0710): chỉ xem và in. Cán bộ xã lập phiếu ở màn Đối soát;
 * lãnh đạo xem; công ty chỉ thấy phiếu của mình (backend lọc).
 */
export function SettlementsPage() {
  const [periodId, setPeriodId] = useState<number>();
  const [printing, setPrinting] = useState<Settlement | null>(null);
  const settlements = useSettlements(periodId);

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
      </Space>
      {settlements.error && <ErrorBlock error={settlements.error} onRetry={() => void settlements.refetch()} />}
      <Table<Settlement>
        rowKey="id"
        loading={settlements.isLoading}
        dataSource={settlements.data ?? []}
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <EmptyBlock title="Kỳ này chưa có phiếu quyết toán" hint="Sau hạn dân đóng, cán bộ xã lập phiếu quyết toán cho từng công ty ở màn Đối soát." /> }}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'code' },
          { title: 'Công ty', render: (_, s) => `${s.companyCode} · ${s.companyName}` },
          { title: 'Công ty phải nộp', dataIndex: 'companyOwes', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Xã phải trả', dataIndex: 'communeOwes', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          {
            title: 'Chênh lệch',
            dataIndex: 'amount',
            align: 'right',
            render: (v: number) => (
              <>
                <MoneyText value={Math.abs(v)} strong />
                <div style={{ fontSize: 12 }}>{settlementDirection(v)}</div>
              </>
            ),
          },
          { title: 'Hình thức', dataIndex: 'method', render: (m: Settlement['method']) => (m ? RECEIPT_METHOD_LABELS[m] : '—') },
          { title: 'Ngày quyết toán', dataIndex: 'settleDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Người đại diện', dataIndex: 'representativeName' },
          {
            title: '',
            render: (_, s) => (
              <Button size="small" onClick={() => setPrinting(s)} aria-label={`In ${s.code}`}>
                In
              </Button>
            ),
          },
        ]}
      />
      <SettlementPrint settlement={printing} onClose={() => setPrinting(null)} />
    </>
  );
}
