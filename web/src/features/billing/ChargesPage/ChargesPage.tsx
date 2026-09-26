import { Select, Space, Table, Tag } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { CHARGE_STATUS_COLORS, CHARGE_STATUS_LABELS, TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { useAreas, usePeriods } from '../../masterdata/api';
import { type Charge, type ChargeQuery, useCharges } from '../api';

/** Nhãn trạng thái hiển thị: "Quá hạn" tính từ hạn đóng, không lưu. */
export function ChargeStatusTag({ charge }: { charge: Pick<Charge, 'status' | 'overdue'> }) {
  if (charge.overdue) return <Tag color="red">Quá hạn</Tag>;
  return <Tag color={CHARGE_STATUS_COLORS[charge.status]}>{CHARGE_STATUS_LABELS[charge.status]}</Tag>;
}

/** Danh sách khoản phải thu: lọc theo kỳ, tổ, trạng thái; phân trang phía máy chủ. */
export function ChargesPage() {
  const periods = usePeriods();
  const areas = useAreas();
  const [query, setQuery] = useState<ChargeQuery>({ page: 0, size: 50 });
  const charges = useCharges(query);

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          aria-label="Lọc theo kỳ"
          allowClear
          placeholder="Mọi kỳ"
          style={{ width: 200 }}
          onChange={(periodId?: number) => setQuery((q) => ({ ...q, periodId, page: 0 }))}
          options={(periods.data ?? []).map((p) => ({ value: p.id, label: p.label }))}
        />
        <Select
          aria-label="Lọc theo tổ"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Mọi tổ"
          style={{ width: 200 }}
          onChange={(areaId?: number) => setQuery((q) => ({ ...q, areaId, page: 0 }))}
          options={(areas.data ?? []).map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
        />
        <Select
          aria-label="Lọc theo trạng thái"
          allowClear
          placeholder="Mọi trạng thái"
          style={{ width: 180 }}
          onChange={(status?: Charge['status']) => setQuery((q) => ({ ...q, status, page: 0 }))}
          options={Object.entries(CHARGE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </Space>
      <Table<Charge>
        rowKey="id"
        size="small"
        loading={charges.isFetching}
        dataSource={charges.data?.items ?? []}
        locale={{
          emptyText: charges.error instanceof ApiError ? charges.error.message : 'Chưa có khoản phải thu',
        }}
        pagination={{
          current: query.page + 1,
          pageSize: query.size,
          total: charges.data?.total ?? 0,
          showSizeChanger: false,
          showTotal: (total) => `${total} khoản`,
          onChange: (page) => setQuery((q) => ({ ...q, page: page - 1 })),
        }}
        columns={[
          { title: 'Mã khoản', dataIndex: 'code' },
          {
            title: 'Hộ',
            render: (_, c) => (
              <>
                {c.subjectCode}
                <br />
                <span style={{ color: '#666' }}>{c.subjectName}</span>
              </>
            ),
          },
          { title: 'Tổ', dataIndex: 'areaCode' },
          { title: 'Công ty', dataIndex: 'companyCode' },
          { title: 'Kỳ', dataIndex: 'periodCode' },
          {
            title: 'Nhóm giá',
            dataIndex: 'tariffGroup',
            render: (g: Charge['tariffGroup']) => (g ? TARIFF_GROUP_LABELS[g] : '—'),
          },
          { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Hạn đóng', dataIndex: 'dueDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Trạng thái', render: (_, c) => <ChargeStatusTag charge={c} /> },
        ]}
      />
    </>
  );
}
