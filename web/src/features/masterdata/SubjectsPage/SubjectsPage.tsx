import { PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, DatePicker, Drawer, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import {
  SUBJECT_STATUS_COLORS,
  SUBJECT_STATUS_LABELS,
  SUBJECT_TYPE_LABELS,
  TARIFF_GROUP_LABELS,
} from '../../../shared/labels';
import {
  type Subject,
  type SubjectQuery,
  useAddContract,
  useAreas,
  useCreateSubject,
  useEndSubject,
  useSubjects,
  useUpdateContract,
  useUpdateSubject,
} from '../api';
import { type ProfileSubmit, SubjectProfileForm } from './SubjectProfileForm';

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

type Editing = { mode: 'create' } | { mode: 'edit'; subject: Subject } | null;

/** Hồ sơ hộ của cán bộ xã: lọc theo tổ/trạng thái, tìm theo mã/tên/SĐT, tạo, sửa, ngừng cung cấp dịch vụ. */
export function SubjectsPage() {
  const { message } = App.useApp();
  const areas = useAreas();
  const [query, setQuery] = useState<SubjectQuery>({ page: 0, size: 20 });
  const subjects = useSubjects(query);
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const addContract = useAddContract();
  const updateContract = useUpdateContract();
  const endSubject = useEndSubject();

  const [editing, setEditing] = useState<Editing>(null);
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
        if (values.contract && values.contractId !== null) {
          await updateContract.mutateAsync({ id: values.contractId, body: values.contract });
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
      setSaveError(errorMessage(err));
    }
  }

  function openEditor(next: Editing) {
    setSaveError(null);
    setEditing(next);
  }

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Hồ sơ hộ
      </Typography.Title>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          aria-label="Tìm hồ sơ"
          placeholder="Mã, tên, SĐT, địa chỉ"
          allowClear
          style={{ width: 260 }}
          onSearch={(q) => setQuery((prev) => ({ ...prev, q: q || undefined, page: 0 }))}
        />
        <Select
          aria-label="Lọc theo tổ"
          allowClear
          placeholder="Tất cả tổ"
          style={{ width: 200 }}
          showSearch
          optionFilterProp="label"
          onChange={(areaId?: number) => setQuery((prev) => ({ ...prev, areaId, page: 0 }))}
          options={(areas.data ?? []).map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
        />
        <Select
          aria-label="Lọc theo trạng thái"
          allowClear
          placeholder="Mọi trạng thái"
          style={{ width: 180 }}
          onChange={(status?: Subject['status']) => setQuery((prev) => ({ ...prev, status, page: 0 }))}
          options={Object.entries(SUBJECT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor({ mode: 'create' })}>
          Thêm hộ
        </Button>
      </Space>
      <Table<Subject>
        rowKey="id"
        loading={subjects.isFetching}
        dataSource={subjects.data?.items ?? []}
        locale={{ emptyText: subjects.error ? errorMessage(subjects.error) : 'Không có hồ sơ phù hợp' }}
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
            render: (code: string, s) => (
              <Button type="link" style={{ padding: 0 }} onClick={() => openEditor({ mode: 'edit', subject: s })}>
                {code}
              </Button>
            ),
          },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Loại', dataIndex: 'subjectType', render: (t: Subject['subjectType']) => SUBJECT_TYPE_LABELS[t] },
          { title: 'Tổ', dataIndex: 'areaCode' },
          { title: 'SĐT', dataIndex: 'phone', render: (p: string | null) => p ?? '—' },
          {
            title: 'Nhóm giá',
            render: (_, s) =>
              s.currentContract ? (
                <>
                  {TARIFF_GROUP_LABELS[s.currentContract.tariffGroup]}{' '}
                  {s.currentContract.exempt && <Tag color="purple">Miễn 100%</Tag>}
                </>
              ) : (
                <Tag>Chưa có hợp đồng</Tag>
              ),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (st: Subject['status']) => <Tag color={SUBJECT_STATUS_COLORS[st]}>{SUBJECT_STATUS_LABELS[st]}</Tag>,
          },
        ]}
      />

      <Drawer
        title={editing?.mode === 'edit' ? `Hồ sơ hộ · ${editing.subject.code}` : 'Thêm hồ sơ hộ'}
        open={editing !== null}
        onClose={() => setEditing(null)}
        width={640}
        destroyOnHidden
        extra={
          editing?.mode === 'edit' && editing.subject.status !== 'ENDED' ? (
            <Button danger onClick={() => setEnding(editing.subject)}>
              Ngừng cung cấp dịch vụ
            </Button>
          ) : null
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
            onCancel={() => setEditing(null)}
          />
        )}
      </Drawer>

      <Modal
        title={ending ? `Ngừng cung cấp dịch vụ · ${ending.code}` : ''}
        open={ending !== null}
        okText="Ngừng cung cấp"
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
        {endSubject.error && <Alert type="error" showIcon message={errorMessage(endSubject.error)} role="alert" />}
        <Form
          form={endForm}
          layout="vertical"
          preserve={false}
          onFinish={(v) =>
            endSubject.mutate(
              { id: ending!.id, endDate: v.endDate.format('YYYY-MM-DD'), reason: v.reason?.trim() || undefined },
              {
                onSuccess: (s) => {
                  message.success(`Đã ngừng cung cấp dịch vụ cho ${s.code}`);
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
    </>
  );
}
