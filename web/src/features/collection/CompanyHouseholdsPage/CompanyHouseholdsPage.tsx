import { Button, Card, Input, Segmented, Select, Space, Table, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { MoneyText } from '../../../shared/MoneyText';
import { EmptyBlock, ErrorBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { normalizeText } from '../../../shared/normalizeText';
import { type CollectorCharge, useCollectors, useCompanyWork } from '../api';
import { ResultSheet } from '../CollectorListPage/ResultSheet';
import { byChipOrder, countChips, WORK_CHIPS, type WorkChip, matchesChip, workState } from '../workState';

/** "Hộ được giao" của công ty (nằm dưới tổng quan): khoản của công ty trong kỳ; lọc khu vực / người đi thu đã thu / trạng thái; ghi thay. */
export function CompanyHouseholdsPage({
  periodId,
  chip,
  onChipChange: setChip,
}: {
  periodId: number | undefined;
  /** Nút lọc trạng thái do tổng quan giữ, để bấm thẻ "Số hộ đã thu" / "Số tiền đã thu" lọc sẵn hộ đã thu. */
  chip: WorkChip;
  onChipChange: (chip: WorkChip) => void;
}) {
  const [areaId, setAreaId] = useState<number>();
  const [collectorId, setCollectorId] = useState<number>();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<CollectorCharge | null>(null);
  // Lọc người đi thu do máy chủ làm: chỉ khoản người đó đã thu (UC-33).
  const work = useCompanyWork(periodId, collectorId);
  const collectors = useCollectors();
  // Khoản Chưa thu của kỳ đã khóa là công nợ của hộ (góp ý BA 05/10): vẫn ghi thu được, tiền tính vào kỳ đang thu.

  const items = useMemo(() => work.data ?? [], [work.data]);
  const areaOptions = useMemo(() => {
    const m = new Map<number, string>();
    items.forEach((w) => m.set(w.charge.areaId, w.charge.areaCode));
    return [...m].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));
  }, [items]);

  // Lọc khu vực / người thu / tìm kiếm trước, đếm theo nút lọc sau để số trên nút khớp danh sách.
  const scoped = useMemo(() => {
    const needle = normalizeText(q.trim());
    return items.filter((w) => {
      if (areaId !== undefined && w.charge.areaId !== areaId) return false;
      return !needle || normalizeText(`${w.charge.subjectName} ${w.charge.subjectCode} ${w.charge.subjectAddress}`).includes(needle);
    });
  }, [items, areaId, q]);

  const counts = useMemo(() => countChips(scoped), [scoped]);

  const visible = useMemo(
    () =>
      scoped
        .filter((w) => matchesChip(w, chip))
        .sort(byChipOrder),
    [scoped, chip],
  );

  const error = work.error ?? collectors.error;
  return (
    <Card size="small" title="Hộ của công ty" className="section-card" id="company-households">
      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search
          allowClear
          placeholder="Tên hộ, mã hộ, địa chỉ"
          aria-label="Tìm hộ"
          style={{ width: 300 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select allowClear aria-label="Khu vực" placeholder="Tất cả khu vực" style={{ width: 170 }} value={areaId} onChange={setAreaId} options={areaOptions} />
        <Select
          allowClear
          aria-label="Người đi thu"
          placeholder="Người đi thu đã thu"
          style={{ width: 220 }}
          value={collectorId}
          onChange={setCollectorId}
          options={(collectors.data ?? []).map((c) => ({ value: c.id, label: c.fullName }))}
        />
      </Space>
      <div style={{ marginBottom: 12 }}>
        <Segmented<WorkChip>
          value={chip}
          onChange={setChip}
          options={WORK_CHIPS.map((c) => ({
            value: c.value,
            label: (
              <span>
                {c.label} <Typography.Text strong>{counts[c.value] ?? 0}</Typography.Text>
              </span>
            ),
          }))}
        />
      </div>
      {error && <ErrorBlock error={error} onRetry={() => void work.refetch()} />}
      <Table<CollectorCharge>
        size="small"
        rowKey={(w) => w.charge.id}
        loading={work.isLoading}
        dataSource={visible}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `${t} hộ` }}
        locale={{
          emptyText:
            items.length === 0 ? (
              <EmptyBlock title="Kỳ này công ty chưa có khoản nào" hint="Xã phát hành phiếu yêu cầu thu thì khoản của hộ hiện ở đây." />
            ) : (
              <EmptyBlock title="Không có hộ phù hợp" hint="Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm." />
            ),
        }}
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
          {
            title: 'Địa chỉ',
            render: (_, w) => (
              <>
                <div>{w.charge.subjectAddress}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {w.charge.areaCode}
                </Typography.Text>
              </>
            ),
          },
          {
            title: 'Số tiền',
            align: 'right',
            render: (_, w) => <MoneyText value={w.charge.amount} />,
          },
          {
            title: 'Kết quả',
            render: (_, w) => {
              const s = workState(w);
              return <StatusTag tone={s.tone}>{s.label}</StatusTag>;
            },
          },
          {
            title: '',
            render: (_, w) =>
              w.charge.status === 'UNPAID' ? (
                <Button size="small" onClick={() => setEditing(w)} aria-label={`Ghi thu ${w.charge.subjectName}`}>
                  Ghi thu
                </Button>
              ) : null,
          },
        ]}
      />
      <ResultSheet
        item={editing}
        onClose={() => setEditing(null)}
        collectors={collectors.data ?? []}
        defaultCollectorId={collectorId}
      />
    </Card>
  );
}
