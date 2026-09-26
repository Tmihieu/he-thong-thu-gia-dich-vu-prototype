import { Alert, Button, Card, Empty, Input, List, Segmented, Space, Spin, Statistic, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { ApiError } from '../../../api/client';
import { MoneyText } from '../../../shared/MoneyText';
import { normalizeText } from '../../../shared/normalizeText';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type CollectorCharge, useCashHeld, useMyWork } from '../api';
import { WORK_FILTERS, type WorkGroup, workState } from '../workState';
import { ResultSheet } from './ResultSheet';

/** Danh sách thu của người đi thu (giao diện điện thoại, §10 bước 3). */
export function CollectorListPage() {
  const [periodId, setPeriodId] = useState<number>();
  const [filter, setFilter] = useState<WorkGroup | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<CollectorCharge | null>(null);
  const work = useMyWork(periodId);
  const cash = useCashHeld();
  const items = useMemo(() => work.data ?? [], [work.data]);

  const visible = useMemo(() => {
    const needle = normalizeText(q.trim());
    return items.filter((w) => {
      if (filter !== 'ALL' && workState(w).group !== filter) return false;
      if (!needle) return true;
      return normalizeText(`${w.charge.subjectName} ${w.charge.subjectCode} ${w.charge.subjectAddress}`).includes(needle);
    });
  }, [items, filter, q]);

  const paid = items.filter((w) => w.charge.status === 'PAID').length;
  const held = cash.data?.[0]?.held ?? 0;

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <PeriodSelect value={periodId} onChange={setPeriodId} />
      <Space size={12} style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
        <Card size="small">
          <Statistic title="Đã thu" value={`${paid}/${items.length} hộ`} />
        </Card>
        <Card size="small">
          <Statistic title="Tiền mặt đang giữ" value={held} formatter={(v) => <MoneyText value={Number(v)} strong />} />
        </Card>
      </Space>
      <Input.Search allowClear placeholder="Tìm tên hộ, mã hộ, địa chỉ" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm hộ" />
      <Segmented<WorkGroup | 'ALL'> block options={WORK_FILTERS} value={filter} onChange={setFilter} />
      {work.error && (
        <Alert type="error" showIcon message={work.error instanceof ApiError ? work.error.message : 'Không tải được danh sách thu'} />
      )}
      {work.isLoading ? (
        <Spin />
      ) : visible.length === 0 ? (
        <Empty description={items.length === 0 ? 'Chưa có hộ nào trong tổ được giao' : 'Không có hộ phù hợp'} />
      ) : (
        <List<CollectorCharge>
          dataSource={visible}
          rowKey={(w) => w.charge.id}
          renderItem={(w) => {
            const s = workState(w);
            return (
              <List.Item
                aria-label={w.charge.subjectName}
                actions={
                  w.charge.status === 'UNPAID'
                    ? [
                        <Button key="update" type="primary" size="small" onClick={() => setEditing(w)}>
                          Cập nhật
                        </Button>,
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  title={
                    <Space size={6} wrap>
                      <span>{w.charge.subjectName}</span>
                      <Tag color={s.color}>{s.label}</Tag>
                    </Space>
                  }
                  description={
                    <>
                      <div>{w.charge.subjectAddress}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {w.charge.subjectCode} · {w.charge.areaCode} ·{' '}
                        {w.charge.status === 'UNPAID' ? 'còn thiếu ' : 'phải thu '}
                        <MoneyText value={w.charge.status === 'UNPAID' ? w.remainingAmount : w.charge.amount} />
                      </Typography.Text>
                    </>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
      <ResultSheet item={editing} onClose={() => setEditing(null)} />
    </Space>
  );
}
