import { ExclamationCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Checkbox, DatePicker, Drawer, Form, Input, Modal, Select, Space, Table, Tooltip, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';

import { errorTextOrNull } from '../../../shared/errorText';
import { StatusTag } from '../../../shared/StatusTag';
import { DateText } from '../../../shared/DateText';
import { PageHeader } from '../../../shared/PageHeader';
import {
  SUBJECT_STATUS_LABELS,
  SUBJECT_TYPE_LABELS,
  TARIFF_GROUP_LABELS,
} from '../../../shared/labels';
import {
  type ContractRequest,
  type Subject,
  type SubjectQuery,
  getSubject,
  useAddContract,
  useAreas,
  useCreateSubject,
  useEndSubject,
  useResumeSubject,
  useMemberHistory,
  useSubjects,
  useUpdateContract,
  useUpdateSubject,
} from '../api';
import { ImportSubjectsModal } from './ImportSubjectsModal';
import { type ProfileSubmit, SubjectProfileForm } from './SubjectProfileForm';

type Editing = { mode: 'create' } | { mode: 'edit'; subject: Subject } | null;

type CurrentContract = NonNullable<Subject['currentContract']>;

/** Hợp đồng trên form không khác hợp đồng đang hiệu lực. */
function sameContract(req: ContractRequest, c: CurrentContract): boolean {
  return (
    req.tariffGroup === c.tariffGroup &&
    req.validFrom === c.validFrom &&
    (req.validTo ?? null) === c.validTo &&
    (req.quotaKg ?? null) === (c.quotaKg ?? null) &&
    req.exempt === c.exempt &&
    (req.exemptReason ?? null) === (c.exemptReason ?? null) &&
    (req.exemptDecisionNo ?? null) === (c.exemptDecisionNo ?? null)
  );
}

function calculationMethod(subject: Subject): string {
  const contract = subject.currentContract;
  if (!contract) return '';
  if (contract.tariffGroup === 'HH_PER_CAPITA') {
    return subject.memberCount ? `Đơn giá/người × ${subject.memberCount} người` : 'Đơn giá/người × số nhân khẩu';
  }
  if (contract.tariffGroup === 'BY_VOLUME' || contract.tariffGroup === 'FULL_COST_BY_KG') {
    return contract.quotaKg ? `Đơn giá/kg × ${contract.quotaKg} kg/tháng` : 'Đơn giá/kg × định mức';
  }
  return 'Mức thu cố định/tháng';
}

const statusDots: Record<Subject['status'], { label: string; className: string }> = {
  ACTIVE: { label: 'Đang cung cấp', className: 'subject-status-dot-active' },
  ENDED: { label: 'Không cung cấp', className: 'subject-status-dot-ended' },
  PENDING: { label: 'Chờ xử lý', className: 'subject-status-dot-pending' },
};

/** Lịch sử đổi số nhân khẩu của hộ (đọc từ nhật ký thao tác). Chỉ hiện khi từng có thay đổi. */
function MemberHistory({ subjectId }: { subjectId: number }) {
  const history = useMemberHistory(subjectId);
  const rows = history.data ?? [];
  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <Typography.Title level={5}>Lịch sử số nhân khẩu</Typography.Title>
      <Table
        size="small"
        rowKey={(r) => `${r.at}-${r.to}`}
        pagination={false}
        dataSource={rows}
        columns={[
          { title: 'Ngày', dataIndex: 'at', render: (v: string) => <DateText value={v} /> },
          { title: 'Người sửa', dataIndex: 'by' },
          { title: 'Số người', render: (_, r) => (r.from == null ? `Tạo hồ sơ: ${r.to ?? '—'}` : `${r.from} → ${r.to ?? '—'}`) },
        ]}
      />
    </div>
  );
}

/** Hồ sơ hộ của cán bộ xã: lọc theo tổ/loại hộ/trạng thái, tìm theo mã/tên/SĐT, tạo, sửa, ngừng cung cấp dịch vụ. */
export function SubjectsPage() {
  const { message } = App.useApp();
  const areas = useAreas();
  const [query, setQuery] = useState<SubjectQuery>({ page: 0, size: 20 });
  const [unnormalizedOnly, setUnnormalizedOnly] = useState(false);
  const subjects = useSubjects(query);
  const items = subjects.data?.items ?? [];
  const isUnnormalized = (s: Subject) => s.streetPending || !s.streetId;
  const unnormalizedCount = items.filter(isUnnormalized).length;
  const shownItems = unnormalizedOnly ? items.filter(isUnnormalized) : items;
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const addContract = useAddContract();
  const updateContract = useUpdateContract();
  const endSubject = useEndSubject();
  const resumeSubject = useResumeSubject();

  const [editing, setEditing] = useState<Editing>(null);
  const [importing, setImporting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ending, setEnding] = useState<Subject | null>(null);
  const [endForm] = Form.useForm<{ endDate: Dayjs; reason?: string }>();

  const saving = create.isPending || update.isPending || addContract.isPending || updateContract.isPending;

  async function save(values: ProfileSubmit) {
    setSaveError(null);
    try {
      if (editing?.mode === 'edit') {
        const id = editing.subject.id;
        await update.mutateAsync({ id, body: values.subject });
        const current = editing.subject.currentContract;
        if (values.contract && values.contractId !== null) {
          // Đổi số người làm máy chủ tự tách hợp đồng theo kỳ; gửi lại hợp đồng cũ nguyên vẹn sẽ mở lại hợp đồng đã đóng.
          if (!current || !sameContract(values.contract, current)) {
            await updateContract.mutateAsync({ id: values.contractId, body: values.contract });
          }
        } else if (values.contract) {
          await addContract.mutateAsync({ subjectId: id, body: values.contract });
        }
        message.success(`Đã lưu hồ sơ ${editing.subject.code}`);
      } else {
        const created = await create.mutateAsync({ ...values.subject, contract: values.contract ?? undefined });
        message.success(`Đã tạo hồ sơ ${created.code}`);
      }
      setEditing(null);
    } catch (err) {
      setSaveError(errorTextOrNull(err));
    }
  }

  /** Từ cảnh báo nghi trùng: chuyển sang sửa hồ sơ đã có. */
  async function openExisting(id: number) {
    try {
      openEditor({ mode: 'edit', subject: await getSubject(id) });
    } catch (err) {
      setSaveError(errorTextOrNull(err));
    }
  }

  function openEditor(next: Editing) {
    setSaveError(null);
    setEditing(next);
  }

  return (
    <>
      <PageHeader
        title="Hồ sơ hộ"
        description="Tìm, thêm, sửa hồ sơ và đăng ký thu phí của hộ gia đình, nguồn thải nhỏ và nguồn thải lớn."
        extra={
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setImporting(true)}>
              Nhập từ Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor({ mode: 'create' })}>
              Thêm hộ
            </Button>
          </Space>
        }
      />
      <Card className="section-card subjects-list-card">
        <Space wrap className="subjects-filters">
          <Input.Search
            aria-label="Tìm hồ sơ"
            placeholder="Mã, tên, SĐT, địa chỉ"
            allowClear
            style={{ width: 260 }}
            onSearch={(q) => setQuery((prev) => ({ ...prev, q: q || undefined, page: 0 }))}
          />
          <Select
            aria-label="Lọc theo ấp"
            allowClear
            placeholder="Tất cả ấp"
            style={{ width: 200 }}
            showSearch
            optionFilterProp="label"
            onChange={(areaId?: number) => setQuery((prev) => ({ ...prev, areaId, page: 0 }))}
            options={(areas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
          />
          <Select
            aria-label="Lọc theo loại hộ"
            allowClear
            placeholder="Mọi loại hộ"
            style={{ width: 180 }}
            onChange={(subjectType?: Subject['subjectType']) => setQuery((prev) => ({ ...prev, subjectType, page: 0 }))}
            options={Object.entries(SUBJECT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Select
            aria-label="Lọc theo trạng thái"
            allowClear
            placeholder="Mọi trạng thái"
            style={{ width: 180 }}
            onChange={(status?: Subject['status']) => setQuery((prev) => ({ ...prev, status, page: 0 }))}
            options={Object.entries(SUBJECT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Checkbox checked={unnormalizedOnly} onChange={(e) => setUnnormalizedOnly(e.target.checked)}>
            Địa chỉ chưa chuẩn hóa ({unnormalizedCount} trên trang)
          </Checkbox>
        </Space>
        <Table<Subject>
          rowKey="id"
          loading={subjects.isFetching}
          dataSource={shownItems}
          scroll={{ x: 900 }}
          locale={{ emptyText: subjects.error ? errorTextOrNull(subjects.error) : 'Không có hồ sơ phù hợp' }}
          pagination={{
            current: query.page + 1,
            pageSize: query.size,
            total: subjects.data?.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `${total} hồ sơ`,
            onChange: (page) => setQuery((prev) => ({ ...prev, page: page - 1 })),
          }}
          columns={[
            {
              title: 'Mã',
              dataIndex: 'code',
              className: 'cell-nowrap',
              width: 120,
              fixed: 'left',
              render: (code: string, s) => (
                <Button type="link" style={{ padding: 0 }} onClick={() => openEditor({ mode: 'edit', subject: s })}>
                  {code}
                </Button>
              ),
            },
            { title: 'Tên', dataIndex: 'name', className: 'cell-left', width: 140, ellipsis: true },
            { title: 'Loại', dataIndex: 'subjectType', className: 'cell-nowrap', width: 100, render: (t: Subject['subjectType']) => SUBJECT_TYPE_LABELS[t] },
            { title: 'Ấp', dataIndex: 'areaId', className: 'cell-left', width: 100, ellipsis: true, render: (areaId: number, s) => areas.data?.find((a) => a.id === areaId)?.name ?? s.areaCode },
            {
              title: 'Địa chỉ',
              dataIndex: 'address',
              className: 'cell-left',
              ellipsis: true,
              width: 170,
              render: (address: string, s) => (
                <>
                  {address}
                  {(s.streetPending || !s.streetId) && (
                    <Tooltip title={s.streetPending ? 'Đường đang chờ xác minh' : 'Địa chỉ chưa chuẩn hóa theo danh mục đường'}>
                      <ExclamationCircleOutlined style={{ marginLeft: 8, color: s.streetPending ? '#8a5300' : '#7f8b99' }} aria-label="Địa chỉ cần chuẩn hóa" />
                    </Tooltip>
                  )}
                </>
              ),
            },
            {
              title: 'Nhóm giá / Cách tính',
              width: 200,
              className: 'cell-left',
              render: (_, s) =>
                s.currentContract ? (
                  <div className="subject-billing-method">
                    <span>{TARIFF_GROUP_LABELS[s.currentContract.tariffGroup]}</span>
                    <Typography.Text type="secondary">{calculationMethod(s)}</Typography.Text>
                    {s.currentContract.exempt && <StatusTag color="purple">Miễn 100%</StatusTag>}
                  </div>
                ) : (
                  <StatusTag>Chưa đăng ký thu</StatusTag>
                ),
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 70,
              render: (status: Subject['status']) => (
                <Tooltip title={statusDots[status].label}>
                  <span role="img" aria-label={statusDots[status].label} className={`subject-status-dot ${statusDots[status].className}`} />
                </Tooltip>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={editing?.mode === 'edit' ? `Hồ sơ hộ · ${editing.subject.code}` : 'Thêm hồ sơ hộ'}
        open={editing !== null}
        onClose={() => setEditing(null)}
        width={640}
        destroyOnHidden
        extra={
          editing?.mode === 'edit' && (editing.subject.status === 'ENDED' ? (
            <Button type="primary" loading={resumeSubject.isPending} onClick={() =>
              resumeSubject.mutate(editing.subject.id, {
                onSuccess: (s) => {
                  message.success(`Đã tiếp tục cung cấp dịch vụ cho ${s.code}`);
                  setEditing(null);
                },
                onError: (err) => setSaveError(errorTextOrNull(err)),
              })
            }>
              Tiếp tục cung cấp dịch vụ
            </Button>
          ) : (
            <Button type="primary" danger onClick={() => setEnding(editing.subject)}>
              Tạm ngừng cung cấp dịch vụ
            </Button>
          ))
        }
      >
        {editing && (
          <SubjectProfileForm
            key={editing.mode === 'edit' ? editing.subject.id : 'new'}
            subject={editing.mode === 'edit' ? editing.subject : undefined}
            areas={areas.data ?? []}
            submitting={saving}
            error={saveError}
            onSubmit={save}
            onOpenExisting={(id) => void openExisting(id)}
            onCancel={() => setEditing(null)}
          />
        )}
        {editing?.mode === 'edit' && <MemberHistory subjectId={editing.subject.id} />}
      </Drawer>

      <Modal
        title={ending ? `Tạm ngừng cung cấp dịch vụ · ${ending.code}` : ''}
        open={ending !== null}
        okText="Tạm ngừng cung cấp"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
        confirmLoading={endSubject.isPending}
        onCancel={() => {
          setEnding(null);
          endSubject.reset();
        }}
        onOk={() => endForm.submit()}
        destroyOnHidden
      >
        {endSubject.error && <Alert type="error" showIcon message={errorTextOrNull(endSubject.error)} role="alert" />}
        <Form
          form={endForm}
          layout="vertical"
          preserve={false}
          onFinish={(v) =>
            endSubject.mutate(
              { id: ending!.id, endDate: v.endDate.format('YYYY-MM-DD'), reason: v.reason?.trim() || undefined },
              {
                onSuccess: (s) => {
                  message.success(`Đã tạm ngừng cung cấp dịch vụ cho ${s.code}`);
                  setEnding(null);
                  setEditing(null);
                },
              },
            )
          }
        >
          <Form.Item
            label="Ngày cuối cùng còn cung cấp"
            name="endDate"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
          >
            <DatePicker format="DD/MM/YYYY" placeholder="dd/mm/yyyy" />
          </Form.Item>
          <Form.Item label="Lý do" name="reason">
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>
      <ImportSubjectsModal open={importing} onClose={() => setImporting(false)} />
    </>
  );
}
