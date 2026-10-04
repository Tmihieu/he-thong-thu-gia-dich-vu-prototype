import { Button, Segmented, Select, Space, Table } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { StatusTag } from '../../../shared/StatusTag';
import { brand } from '../../../app/theme';
import { CHARGE_STATUS_COLORS, CHARGE_STATUS_LABELS, TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { CreateApprovalModal } from '../../leadership/CreateApprovalModal';
import { useAreas, useCompanies, usePeriods } from '../../masterdata/api';
import { type Charge, type ChargeQuery, useCharges } from '../api';

/** Nhãn trạng thái hiển thị: "Quá hạn" tính từ hạn đóng, không lưu. */
export function ChargeStatusTag({ charge }: { charge: Pick<Charge, 'status' | 'overdue'> }) {
  if (charge.overdue) return <StatusTag color="red">Quá hạn</StatusTag>;
  return <StatusTag color={CHARGE_STATUS_COLORS[charge.status]}>{CHARGE_STATUS_LABELS[charge.status]}</StatusTag>;
}

/** Danh sách khoản phải thu: lọc theo kỳ, tổ, công ty, trạng thái (nút bấm); phân trang phía máy chủ. */
export function ChargesPage() {
  const periods = usePeriods();
  const areas = useAreas();
  const companies = useCompanies();
  const [query, setQuery] = useState<ChargeQuery>({ page: 0, size: 50 });
  const charges = useCharges(query);
  const [proposing, setProposing] = useState<{ charge: Charge; type: 'REFUND' | 'WRITE_OFF' } | null>(null);
  const periodLabel = new Map((periods.data ?? []).map((p) => [p.id, p.label]));

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
          aria-label="Lọc theo công ty"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Mọi công ty"
          style={{ width: 240 }}
          onChange={(companyId?: number) => setQuery((q) => ({ ...q, companyId, page: 0 }))}
          options={(companies.data ?? []).map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
        />
        <Segmented<Charge['status'] | 'ALL'>
          aria-label="Lọc theo trạng thái"
          value={query.status ?? 'ALL'}
          onChange={(v) => setQuery((q) => ({ ...q, status: v === 'ALL' ? undefined : v, page: 0 }))}
          options={[
            { value: 'ALL', label: 'Tất cả' },
            ...(Object.keys(CHARGE_STATUS_LABELS) as Charge['status'][]).map((value) => ({
              value,
              label: CHARGE_STATUS_LABELS[value],
            })),
          ]}
        />
      </Space>
      <Table<Charge>
        rowKey="id"
        size="small"
        scroll={{ x: 'max-content' }}
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
          {
            title: 'Mã khoản',
            className: 'cell-nowrap',
            render: (_, c) => (
              <>
                <strong>{c.code}</strong>
                <br />
                <span style={{ color: brand.textMuted, fontSize: 13 }}>{c.requestCode}</span>
              </>
            ),
          },
          {
            title: 'Đối tượng',
            render: (_, c) => (
              <>
                <strong>{c.subjectName}</strong>
                <br />
                <span style={{ color: brand.textMuted, fontSize: 13 }}>
                  {c.subjectCode}{c.tariffGroup ? ` · ${TARIFF_GROUP_LABELS[c.tariffGroup]}` : ''}
                </span>
              </>
            ),
          },
          { title: 'Kỳ', className: 'cell-nowrap', render: (_, c) => periodLabel.get(c.periodId) ?? c.periodCode },
          { title: 'Số tiền', dataIndex: 'amount', align: 'right', className: 'cell-money', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Công ty', dataIndex: 'companyCode', className: 'cell-nowrap' },
          { title: 'Trạng thái', render: (_, c) => <ChargeStatusTag charge={c} /> },
          {
            title: '',
            className: 'row-actions cell-nowrap',
            render: (_, c) =>
              c.status === 'UNPAID' ? (
                <Button size="small" type="link" onClick={() => setProposing({ charge: c, type: 'WRITE_OFF' })} aria-label={`Đề nghị xóa nợ ${c.code}`}>
                  Đề nghị xóa nợ
                </Button>
              ) : c.status === 'PAID' ? (
                <Button size="small" type="link" onClick={() => setProposing({ charge: c, type: 'REFUND' })} aria-label={`Đề nghị hoàn ${c.code}`}>
                  Đề nghị hoàn
                </Button>
              ) : null,
          },
        ]}
      />
      <CreateApprovalModal target={proposing} onClose={() => setProposing(null)} />
    </>
  );
}
