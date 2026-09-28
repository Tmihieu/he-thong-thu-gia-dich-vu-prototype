import { App, Button, Descriptions, Drawer, Input, Segmented, Space, Statistic, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { ApiError } from '../../../api/client';
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

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

const statusTag = (s: Company['status']) =>
  s === 'ACTIVE' ? <Tag color="green">Hoạt động</Tag> : <Tag>Tạm ngưng</Tag>;

/** Công ty môi trường (cán bộ xã): danh sách, thêm/sửa, chi tiết có khu vực phụ trách và tiến độ nộp theo kỳ. */
export function CompaniesPage() {
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
  const ledger = useCompanyLedger(detailId === null ? undefined : periodId);

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
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Công ty môi trường
        </Typography.Title>
        <Button type="primary" onClick={() => openForm(null)}>
          + Thêm công ty
        </Button>
      </Space>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Tên, mã, đầu mối, điện thoại" style={{ width: 280 }} onChange={(e) => setQ(e.target.value)} />
        <Segmented<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'ACTIVE', label: 'Hoạt động' },
            { value: 'INACTIVE', label: 'Tạm ngưng' },
          ]}
        />
      </Space>
      <Table<Company>
        rowKey="id"
        loading={companies.isLoading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: errorMessage(companies.error) ?? 'Không có công ty phù hợp' }}
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
              <Button
                type="primary"
                disabled={detail.status !== 'ACTIVE'}
                onClick={() => {
                  assign.reset();
                  setAssigning(true);
                }}
              >
                + Phân công khu vực
              </Button>
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

            <Space style={{ margin: '24px 0 12px' }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Tiến độ nộp
              </Typography.Title>
              <PeriodSelect value={periodId} onChange={setPeriodId} />
              {row && <Tag color={PROGRESS_COLORS[row.progress]}>{PROGRESS_LABELS[row.progress]}</Tag>}
            </Space>
            {row ? (
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
        error={errorMessage(saving.error)}
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
          areas={areas.data ?? []}
          companies={[detail]}
          initialAreaIds={[]}
          initialCompanyId={detail.id}
          submitting={assign.isPending}
          error={errorMessage(assign.error)}
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
