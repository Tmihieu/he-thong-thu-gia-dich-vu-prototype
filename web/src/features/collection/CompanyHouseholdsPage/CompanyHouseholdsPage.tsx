import { Alert, Button, Input, Segmented, Select, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { ApiError } from '../../../api/client';
import { MoneyText } from '../../../shared/MoneyText';
import { normalizeText } from '../../../shared/normalizeText';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type CollectorCharge, useCollectorAssignments, useCollectors, useCompanyWork } from '../api';
import { ResultSheet } from '../CollectorListPage/ResultSheet';
import { WORK_FILTERS, type WorkGroup, workState } from '../workState';

/** "Hộ được giao" của công ty: khoản các tổ mình phụ trách trong kỳ; lọc tổ / trạng thái / người đi thu; ghi thay. */
export function CompanyHouseholdsPage() {
  const [periodId, setPeriodId] = useState<number>();
  const [areaId, setAreaId] = useState<number>();
  const [collectorId, setCollectorId] = useState<number>();
  const [filter, setFilter] = useState<WorkGroup | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<CollectorCharge | null>(null);
  const work = useCompanyWork(periodId);
  const assignments = useCollectorAssignments();
  const collectors = useCollectors();

  const collectorOfArea = useMemo(() => {
    const m = new Map<number, { id: number; name: string }>();
    (assignments.data ?? []).forEach((a) => m.set(a.areaId, { id: a.collectorId, name: a.collectorName }));
    return m;
  }, [assignments.data]);

  const items = useMemo(() => work.data ?? [], [work.data]);
  const areaOptions = useMemo(() => {
    const m = new Map<number, string>();
    items.forEach((w) => m.set(w.charge.areaId, w.charge.areaCode));
    return [...m].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));
  }, [items]);

  const visible = useMemo(() => {
    const needle = normalizeText(q.trim());
    return items.filter((w) => {
      if (areaId !== undefined && w.charge.areaId !== areaId) return false;
      if (collectorId !== undefined && collectorOfArea.get(w.charge.areaId)?.id !== collectorId) return false;
      if (filter !== 'ALL' && workState(w).group !== filter) return false;
      return !needle || normalizeText(`${w.charge.subjectName} ${w.charge.subjectCode} ${w.charge.subjectAddress}`).includes(needle);
    });
  }, [items, areaId, collectorId, collectorOfArea, filter, q]);

  const error = work.error ?? assignments.error ?? collectors.error;
  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
        <Select
          allowClear
          aria-label="Tổ"
          placeholder="Tất cả tổ"
          style={{ width: 160 }}
          value={areaId}
          onChange={setAreaId}
          options={areaOptions}
        />
        <Select
          allowClear
          aria-label="Người đi thu"
          placeholder="Tất cả người đi thu"
          style={{ width: 220 }}
          value={collectorId}
          onChange={setCollectorId}
          options={(collectors.data ?? []).map((c) => ({ value: c.id, label: c.fullName }))}
        />
        <Input.Search allowClear placeholder="Tên hộ, mã hộ, địa chỉ" aria-label="Tìm hộ" value={q} onChange={(e) => setQ(e.target.value)} />
      </Space>
      <Segmented<WorkGroup | 'ALL'> options={WORK_FILTERS} value={filter} onChange={setFilter} style={{ marginBottom: 12 }} />
      {error && <Alert type="error" showIcon message={error instanceof ApiError ? error.message : 'Không tải được danh sách hộ'} />}
      <Table<CollectorCharge>
        rowKey={(w) => w.charge.id}
        loading={work.isLoading}
        dataSource={visible}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `${t} hộ` }}
        locale={{ emptyText: items.length === 0 ? 'Kỳ này công ty chưa có khoản nào' : 'Không có hộ phù hợp' }}
        columns={[
          {
            title: 'Hộ',
            render: (_, w) => (
              <>
                <div>{w.charge.subjectName}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {w.charge.subjectCode}
                </Typography.Text>
              </>
            ),
          },
          { title: 'Địa chỉ', render: (_, w) => w.charge.subjectAddress },
          { title: 'Tổ', render: (_, w) => w.charge.areaCode },
          { title: 'Người đi thu', render: (_, w) => collectorOfArea.get(w.charge.areaId)?.name ?? '—' },
          { title: 'Phải thu', align: 'right', render: (_, w) => <MoneyText value={w.charge.amount} /> },
          { title: 'Đã thu', align: 'right', render: (_, w) => <MoneyText value={w.paidAmount} /> },
          {
            title: 'Kết quả',
            render: (_, w) => {
              const s = workState(w);
              return <Tag color={s.color}>{s.label}</Tag>;
            },
          },
          {
            title: '',
            render: (_, w) =>
              w.charge.status === 'UNPAID' ? (
                <Button size="small" onClick={() => setEditing(w)} aria-label={`Cập nhật ${w.charge.subjectName}`}>
                  Cập nhật
                </Button>
              ) : null,
          },
        ]}
      />
      <ResultSheet
        item={editing}
        onClose={() => setEditing(null)}
        collectors={collectors.data ?? []}
        defaultCollectorId={editing ? collectorOfArea.get(editing.charge.areaId)?.id : undefined}
      />
    </>
  );
}
