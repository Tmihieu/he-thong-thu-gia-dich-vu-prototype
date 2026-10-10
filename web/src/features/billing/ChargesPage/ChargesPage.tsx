import { Card, Input, Select, Space, Table } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { StatusTag } from '../../../shared/StatusTag';
import { brand } from '../../../app/theme';
import { DateText } from '../../../shared/DateText';
import { CHARGE_STATUS_COLORS, CHARGE_STATUS_LABELS, PAYMENT_METHOD_LABELS, TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { useAreas, useCompanies, usePeriods } from '../../masterdata/api';
import { type Charge, type ChargeQuery, useCharges } from '../api';
import { ChargeDetailDrawer } from './ChargeDetailDrawer';

/** Nhãn trạng thái hiển thị: "Quá hạn" tính từ hạn đóng, không lưu. */
export function ChargeStatusTag({ charge }: { charge: Pick<Charge, 'status' | 'overdue'> }) {
  if (charge.overdue) return <StatusTag color="red">Quá hạn</StatusTag>;
  return <StatusTag color={CHARGE_STATUS_COLORS[charge.status]}>{CHARGE_STATUS_LABELS[charge.status]}</StatusTag>;
}

/** Danh sách khoản phải thu: lọc theo kỳ, tổ, công ty, trạng thái; phân trang phía máy chủ. Bấm dòng mở chi tiết (điều chỉnh / hủy). */
export function ChargesPage() {
  const periods = usePeriods();
  const areas = useAreas();
  const companies = useCompanies();
  const [query, setQuery] = useState<ChargeQuery>({ page: 0, size: 50 });
  const charges = useCharges(query);
  const [openId, setOpenId] = useState<number | null>(null);
  const periodLabel = new Map((periods.data ?? []).map((p) => [p.id, p.label]));

  return (
    <Card className="section-card subjects-list-card">
      <Space wrap className="subjects-filters">
        <Input.Search
          allowClear
          aria-label="Tìm hộ"
          placeholder="Tìm theo tên hoặc mã hộ"
          style={{ width: 260 }}
          onSearch={(q) => setQuery((cur) => ({ ...cur, q: q.trim() || undefined, page: 0 }))}
        />
        <Select
          aria-label="Lọc theo kỳ"
          allowClear
          placeholder="Mọi kỳ"
          style={{ width: 200 }}
          onChange={(periodId?: number) => setQuery((q) => ({ ...q, periodId, page: 0 }))}
          options={(periods.data ?? []).map((p) => ({ value: p.id, label: p.label }))}
        />
        <Select
          aria-label="Lọc theo ấp"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Tất cả ấp"
          style={{ width: 200 }}
          onChange={(areaId?: number) => setQuery((q) => ({ ...q, areaId, page: 0 }))}
          options={(areas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
        />
        <Select
          aria-label="Lọc theo công ty"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Mọi công ty"
          style={{ width: 240 }}
          onChange={(companyId?: number) => setQuery((q) => ({ ...q, companyId, page: 0 }))}
          options={(companies.data ?? []).map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
        />
        <Select<Charge['status']>
          aria-label="Lọc theo trạng thái"
          allowClear
          placeholder="Mọi trạng thái"
          style={{ width: 180 }}
          value={query.status}
          onChange={(status) => setQuery((q) => ({ ...q, status, page: 0 }))}
          options={[
            ...(Object.keys(CHARGE_STATUS_LABELS) as Charge['status'][]).map((value) => ({
              value,
              label: CHARGE_STATUS_LABELS[value],
            })),
          ]}
        />
      </Space>
      <Table<Charge>
        rowKey="id"
        size="middle"
        tableLayout="fixed"
        scroll={{ x: 1200 }}
        loading={charges.isFetching}
        onRow={(c) => ({ onClick: () => setOpenId(c.id), style: { cursor: 'pointer' } })}
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
          {
            title: 'Mã khoản',
            width: '15%',
            className: 'cell-nowrap',
            render: (_, c) => <strong>{c.code}</strong>,
          },
          {
            title: 'Đối tượng',
            className: 'cell-left',
            render: (_, c) => (
              <>
                <strong>{c.subjectName}</strong>
                {c.tariffGroup && (
                  <>
                    <br />
                    <span style={{ color: brand.textMuted, fontSize: 13 }}>{TARIFF_GROUP_LABELS[c.tariffGroup]}
                      {c.tariffGroup === 'HH_PER_CAPITA' && c.memberCount ? ` · ${c.memberCount} người` : ''}</span>
                  </>
                )}
              </>
            ),
          },
          { title: 'Kỳ', width: '8%', className: 'cell-nowrap', render: (_, c) => (periodLabel.get(c.periodId) ?? c.periodCode).replace(/^Tháng\s*/, '') },
          { title: 'Số tiền', width: '11%', dataIndex: 'amount', align: 'right', className: 'cell-money', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Hạn đóng', width: '10%', className: 'cell-nowrap', render: (_, c) => <DateText value={c.dueDate} /> },
          { title: 'Ngày đóng', width: '11%', className: 'cell-nowrap', render: (_, c) => (c.paidAt ? <DateText value={c.paidAt} /> : '—') },
          { title: 'Hình thức', width: '11%', className: 'cell-nowrap', render: (_, c) => (c.paymentMethod ? PAYMENT_METHOD_LABELS[c.paymentMethod] : '—') },
          { title: 'Công ty', width: '8%', dataIndex: 'companyCode', className: 'cell-nowrap' },
          { title: 'Trạng thái', width: '11%', render: (_, c) => <ChargeStatusTag charge={c} /> },
        ]}
      />
      <ChargeDetailDrawer chargeId={openId} onClose={() => setOpenId(null)} />
    </Card>
  );
}
