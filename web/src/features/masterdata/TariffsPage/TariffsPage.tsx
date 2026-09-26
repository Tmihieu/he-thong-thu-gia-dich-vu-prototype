import { Table, Tag, Typography } from 'antd';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { STATUS_COLORS, TARIFF_GROUP_LABELS, TARIFF_STATUS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { type TariffRate, type TariffVersion, useTariffs } from '../api';

function RatesTable({ rates }: { rates: TariffRate[] }) {
  return (
    <Table<TariffRate>
      size="small"
      rowKey="tariffGroup"
      pagination={false}
      dataSource={rates}
      columns={[
        { title: 'Nhóm giá', dataIndex: 'tariffGroup', render: (g: TariffRate['tariffGroup']) => TARIFF_GROUP_LABELS[g] },
        { title: 'Thu gom', dataIndex: 'collectionFee', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        { title: 'Xử lý', dataIndex: 'processingFee', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        {
          title: 'Tổng mỗi tháng',
          dataIndex: 'monthlyTotal',
          align: 'right',
          render: (v: number) => <MoneyText value={v} strong />,
        },
        { title: 'Đơn vị tính', dataIndex: 'unitLabel' },
      ]}
    />
  );
}

/** Phiên bản biểu giá (chỉ xem); mở rộng một dòng để xem đơn giá 4 nhóm. */
export function TariffsPage() {
  const tariffs = useTariffs();
  return (
    <>
      <Typography.Paragraph type="secondary">
        Khoản đã phát hành giữ mức giá tại thời điểm phát hành, không đổi theo phiên bản mới.
      </Typography.Paragraph>
      <Table<TariffVersion>
        rowKey="id"
        loading={tariffs.isLoading}
        dataSource={tariffs.data ?? []}
        pagination={false}
        locale={{
          emptyText: tariffs.error instanceof ApiError ? tariffs.error.message : 'Chưa có biểu giá',
        }}
        expandable={{ expandedRowRender: (v) => <RatesTable rates={v.rates} />, rowExpandable: (v) => v.rates.length > 0 }}
        columns={[
          {
            title: 'Phiên bản / căn cứ',
            render: (_, v) => (
              <>
                <Typography.Text strong>{v.code}</Typography.Text>
                <br />
                <Typography.Text type="secondary">{v.legalBasis}</Typography.Text>
              </>
            ),
          },
          { title: 'Phạm vi', dataIndex: 'scopeNote', render: (s: string | null) => s ?? '—' },
          {
            title: 'Hiệu lực',
            render: (_, v) => (
              <>
                <DateText value={v.validFrom} /> – {v.validTo ? <DateText value={v.validTo} /> : 'không thời hạn'}
              </>
            ),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: TariffVersion['status']) => <Tag color={STATUS_COLORS[s]}>{TARIFF_STATUS_LABELS[s]}</Tag>,
          },
        ]}
      />
    </>
  );
}
