import { App, Button, Flex, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { STATUS_COLORS, TARIFF_GROUP_LABELS, TARIFF_STATUS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import {
  type TariffRate,
  type TariffVersion,
  useCreateTariffDraft,
  useIssueTariff,
  useTariffs,
  useUpdateTariffDraft,
} from '../api';
import { TariffFormModal } from './TariffFormModal';

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

const GROUP_ORDER = Object.keys(TARIFF_GROUP_LABELS);

function RatesTable({ rates }: { rates: TariffRate[] }) {
  return (
    <Table<TariffRate>
      size="small"
      rowKey="tariffGroup"
      pagination={false}
      dataSource={[...rates].sort((a, b) => GROUP_ORDER.indexOf(a.tariffGroup) - GROUP_ORDER.indexOf(b.tariffGroup))}
      columns={[
        { title: 'Nhóm giá', dataIndex: 'tariffGroup', render: (g: TariffRate['tariffGroup']) => TARIFF_GROUP_LABELS[g] },
        { title: 'Thu gom', dataIndex: 'collectionFee', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        { title: 'Vận chuyển', dataIndex: 'transportFee', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        {
          title: 'Tổng cộng',
          dataIndex: 'monthlyTotal',
          align: 'right',
          render: (v: number) => <MoneyText value={v} strong />,
        },
        { title: 'Đơn vị tính', dataIndex: 'unitLabel' },
      ]}
    />
  );
}

/** Quản trị soạn, sửa và ban hành biểu giá; khoản đã lập giữ nguyên số tiền. */
export function TariffsPage() {
  const { message } = App.useApp();
  const tariffs = useTariffs();
  const create = useCreateTariffDraft();
  const update = useUpdateTariffDraft();
  const issue = useIssueTariff();
  // undefined = đóng popup, null = tạo mới.
  const [editing, setEditing] = useState<TariffVersion | null | undefined>(undefined);
  const current = (tariffs.data ?? []).find((v) => v.status === 'ACTIVE');

  function openForm(v: TariffVersion | null) {
    create.reset();
    update.reset();
    setEditing(v);
  }

  function saved(v: TariffVersion) {
    setEditing(undefined);
    message.success(`Đã lưu ${v.code}`);
  }

  return (
    <>
      <Flex wrap gap={8} justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">
          Khoản đã phát hành giữ mức giá tại thời điểm phát hành, không đổi theo phiên bản mới.
        </Typography.Text>
        <Button type="primary" onClick={() => openForm(null)}>
          + Tạo dự thảo
        </Button>
      </Flex>
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
          {
            title: '',
            align: 'right',
            render: (_, v) =>
              (
                <Space>
                  <Button size="small" onClick={() => openForm(v)}>
                    Sửa
                  </Button>
                  {v.status === 'DRAFT' && <Popconfirm
                    title={`Ban hành ${v.code}?`}
                    description={
                      <div style={{ maxWidth: 320 }}>
                        Áp dụng từ <DateText value={v.validFrom} />. Bản đang áp dụng kết thúc ngay trước ngày này.
                      </div>
                    }
                    okText="Ban hành"
                    cancelText="Hủy"
                    onConfirm={() =>
                      issue.mutateAsync(v.id).then(
                        () => message.success(`Đã ban hành ${v.code}`),
                        (err: unknown) => message.error(errorMessage(err)),
                      )
                    }
                  >
                    <Button size="small" type="primary">
                      Ban hành
                    </Button>
                  </Popconfirm>}
                </Space>
              ),
          },
        ]}
      />
      <TariffFormModal
        open={editing !== undefined}
        draft={editing ?? null}
        template={current}
        submitting={create.isPending || update.isPending}
        error={errorMessage(create.error ?? update.error)}
        onCreate={(req) => create.mutate(req, { onSuccess: saved })}
        onUpdate={(body) => editing && update.mutate({ id: editing.id, body }, { onSuccess: saved })}
        onCancel={() => setEditing(undefined)}
      />
    </>
  );
}
