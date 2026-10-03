import { App, Button, Descriptions, Drawer, Flex, Input, Segmented, Space, Statistic, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { errorTextOrNull } from '../../../shared/errorText';
import { StatusTag } from '../../../shared/StatusTag';
import { PageHeader } from '../../../shared/PageHeader';
import { ErrorBlock, LoadingBlock } from '../../../shared/StateBlock';
import { DateText } from '../../../shared/DateText';
import { COMPANY_TYPE_LABELS, PROGRESS_COLORS, PROGRESS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { normalizeText } from '../../../shared/normalizeText';
import { useCompanyLedger } from '../../remittance/api';
import {
  type Company,
  useActiveAssignments,
  useAreas,
  useAssignAreas,
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
} from '../api';
import { AssignAreaModal } from '../AreasPage/AssignAreaModal';
import { PeriodSelect } from '../PeriodSelect';
import { CompanyFormModal } from './CompanyFormModal';

type StatusFilter = 'all' | Company['status'];

const statusTag = (s: Company['status']) =>
  s === 'ACTIVE' ? <StatusTag color="green">Đang hợp tác</StatusTag> : <StatusTag>Ngừng hợp tác</StatusTag>;

/**
 * Công ty môi trường. Cán bộ xã: danh sách, sửa, phân công tổ chưa có công ty, tiến độ nộp theo kỳ.
 * Quản trị ({@code admin}): xem địa bàn công ty đang phụ trách. Cả hai vai trò thêm/sửa công ty (BR-MD-03).
 */
export function CompaniesPage({ admin = false }: { admin?: boolean }) {
  const { message } = App.useApp();
  const today = dayjs().format('YYYY-MM-DD');
  const companies = useCompanies();
  const areas = useAreas();
  const active = useActiveAssignments(today);
  const create = useCreateCompany();
  const update = useUpdateCompany();
  const assign = useAssignAreas();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Company | null | undefined>(undefined);
  const [assigning, setAssigning] = useState(false);
  const [periodId, setPeriodId] = useState<number | undefined>();
  const ledger = useCompanyLedger(detailId === null || admin ? undefined : periodId);

  const areaCount = useMemo(() => {
    const m = new Map<number, number>();
    for (const a of active.data ?? []) m.set(a.companyId, (m.get(a.companyId) ?? 0) + 1);
    return m;
  }, [active.data]);
  const rows = useMemo(() => {
    const needle = normalizeText(q);
    return (companies.data ?? [])
      .filter((c) => status === 'all' || c.status === status)
      .filter((c) => !needle || normalizeText(`${c.code} ${c.name} ${c.contactName} ${c.contactPhone}`).includes(needle));
  }, [companies.data, q, status]);

  const unassigned = (areas.data ?? []).filter((a) => !(active.data ?? []).some((x) => x.areaId === a.id));
  const detail = companies.data?.find((c) => c.id === detailId) ?? null;
  const detailAreas = (active.data ?? []).filter((a) => a.companyId === detailId);
  const row = ledger.data?.find((r) => r.companyId === detailId);
  const saving = editing === null ? create : update;

  function openForm(c: Company | null) {
    create.reset();
    update.reset();
    setEditing(c);
  }

  return (
    <>
      {!admin && <PageHeader title="Công ty môi trường" description="Công ty thu gom, khu vực phụ trách và tiến độ nộp tiền về xã." />}
      <Flex wrap gap={8} justify="space-between" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search allowClear placeholder="Tên, mã, đầu mối, điện thoại" style={{ width: 280 }} onChange={(e) => setQ(e.target.value)} />
          <Segmented<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'ACTIVE', label: 'Đang hợp tác' },
              { value: 'INACTIVE', label: 'Ngừng hợp tác' },
            ]}
          />
        </Space>
        <Button type="primary" onClick={() => openForm(null)}>
          + Thêm công ty
        </Button>
      </Flex>
      <Table<Company>
        rowKey="id"
        loading={companies.isLoading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: errorTextOrNull(companies.error) ?? 'Không có công ty phù hợp' }}
        columns={[
          {
            title: 'Công ty',
            render: (_, c) => (
              <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(c.id)}>
                {c.code} · {c.name}
              </Button>
            ),
          },
          {
            title: 'Đầu mối',
            render: (_, c) => (
              <>
                <div>{c.contactName}</div>
                <Typography.Text type="secondary">{c.contactPhone}</Typography.Text>
              </>
            ),
          },
          {
            title: 'Hiệu lực',
            render: (_, c) => (
              <>
                <DateText value={c.validFrom} /> – {c.validTo ? <DateText value={c.validTo} /> : 'chưa xác định'}
              </>
            ),
          },
          { title: 'Khu vực đang phụ trách', align: 'right', render: (_, c) => areaCount.get(c.id) ?? 0 },
          { title: 'Trạng thái', render: (_, c) => statusTag(c.status) },
          { title: 'Thao tác', align: 'right', render: (_, c) => (
            <Button size="small" onClick={() => openForm(c)} aria-label={`Sửa ${c.name}`}>Sửa</Button>
          ) },
        ]}
      />

      <Drawer
        title={detail ? `${detail.code} · ${detail.name}` : ''}
        open={detail !== null}
        onClose={() => setDetailId(null)}
        width={760}
        extra={
          detail && (
            <Space>
              <Button onClick={() => openForm(detail)}>Sửa thông tin</Button>
              {!admin && (
                <Button
                  type="primary"
                  disabled={detail.status !== 'ACTIVE' || unassigned.length === 0}
                  onClick={() => {
                    assign.reset();
                    setAssigning(true);
                  }}
                >
                  + Phân công khu vực
                </Button>
              )}
            </Space>
          )
        }
      >
        {detail && (
          <>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Đầu mối">{detail.contactName}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{detail.contactPhone}</Descriptions.Item>
              <Descriptions.Item label="Hiệu lực">
                <DateText value={detail.validFrom} /> – {detail.validTo ? <DateText value={detail.validTo} /> : 'chưa xác định'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{statusTag(detail.status)}</Descriptions.Item>
              <Descriptions.Item label="Loại hình">{detail.orgType ? COMPANY_TYPE_LABELS[detail.orgType] : '—'}</Descriptions.Item>
              <Descriptions.Item label="Mã số thuế">{detail.taxCode ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>{detail.address ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{detail.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Số hợp đồng với xã">{detail.communeContractNo ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Tài khoản ngân hàng" span={2}>
                {detail.bankAccount ? `${detail.bankAccount}${detail.bankName ? ` · ${detail.bankName}` : ''}` : '—'}
              </Descriptions.Item>
            </Descriptions>

            {!admin && (
              <>
              <Space style={{ margin: '24px 0 12px' }}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Tiến độ nộp
                </Typography.Title>
                <PeriodSelect value={periodId} onChange={setPeriodId} />
                {row && <StatusTag color={PROGRESS_COLORS[row.progress]}>{PROGRESS_LABELS[row.progress]}</StatusTag>}
              </Space>
              {ledger.isLoading ? (
                <LoadingBlock rows={2} />
              ) : ledger.error ? (
                <ErrorBlock error={ledger.error} />
              ) : row ? (
                <Space size="large" wrap>
                  <Statistic title="Phải thu" valueRender={() => <MoneyText value={row.due} />} />
                  <Statistic title="Đã thu" valueRender={() => <MoneyText value={row.collected} />} />
                  <Statistic title="Đã nộp về xã" valueRender={() => <MoneyText value={row.received} />} />
                  <Statistic title="Còn phải nộp" valueRender={() => <MoneyText value={row.remaining} />} />
                  {row.previousDebt > 0 && (
                    <Statistic title="Nợ kỳ trước" valueRender={() => <Typography.Text type="danger"><MoneyText value={row.previousDebt} /></Typography.Text>} />
                  )}
                </Space>
              ) : (
                <Typography.Text type="secondary">Kỳ này công ty chưa có khoản phải thu.</Typography.Text>
              )}
              </>
            )}

            <Typography.Title level={5} style={{ margin: '24px 0 12px' }}>
              Khu vực đang phụ trách ({detailAreas.length})
            </Typography.Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detailAreas}
              locale={{ emptyText: 'Chưa được giao khu vực' }}
              columns={[
                { title: 'Khu vực', render: (_, a) => `${a.areaCode} · ${a.areaName}` },
                {
                  title: 'Hiệu lực',
                  render: (_, a) => (
                    <>
                      <DateText value={a.validFrom} /> – {a.validTo ? <DateText value={a.validTo} /> : 'không thời hạn'}
                    </>
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>

      <CompanyFormModal
        open={editing !== undefined}
        company={editing ?? null}
        submitting={saving.isPending}
        error={errorTextOrNull(saving.error)}
        onCancel={() => setEditing(undefined)}
        onSubmit={(body) => {
          const onSuccess = (c: Company) => {
            message.success(editing ? `Đã lưu ${c.code}` : `Đã thêm ${c.code} · ${c.name}`);
            setEditing(undefined);
          };
          if (editing) update.mutate({ id: editing.id, body }, { onSuccess });
          else create.mutate(body, { onSuccess });
        }}
      />
      {detail && (
        <AssignAreaModal
          open={assigning}
          areas={unassigned}
          companies={[detail]}
          initialAreaIds={[]}
          initialCompanyId={detail.id}
          submitting={assign.isPending}
          error={errorTextOrNull(assign.error)}
          onCancel={() => setAssigning(false)}
          onSubmit={(req) =>
            assign.mutate(req, {
              onSuccess: (created) => {
                message.success(`Đã phân công ${created.length} tổ cho ${detail.code}`);
                setAssigning(false);
              },
            })
          }
        />
      )}
    </>
  );
}
