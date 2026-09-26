import { useQuery } from '@tanstack/react-query';
import { Alert, App, Button, Divider, Form, Input, Segmented, Select, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { api, ApiError } from '../../api/client';
import { DateText } from '../../shared/DateText';
import { normalizeText } from '../../shared/normalizeText';
import { type SubjectPage, useActiveAssignments, useAreas, useCompanies } from '../masterdata/api';
import {
  type Complaint,
  type ComplaintDetail,
  type ComplaintStatus,
  useCloseComplaint,
  useComplaints,
  useCreateComplaint,
  useForwardComplaint,
} from './api';
import { ComplaintDrawer } from './ComplaintDrawer';
import { CreateComplaintForm, TextActionForm } from './ComplaintForms';
import { COMPLAINT_CHANNEL_LABELS, COMPLAINT_STATUS_COLORS, COMPLAINT_STATUS_LABELS } from './labels';

type Filter = ComplaintStatus | 'ALL' | 'OVERDUE';

function errorText(e: unknown) {
  return e ? (e instanceof ApiError ? e.message : 'Không thực hiện được. Vui lòng thử lại.') : null;
}

/** Thao tác của xã trên một khiếu nại chưa giải quyết: chuyển công ty (một lần), đóng kèm kết quả. */
function CommuneActions({ detail }: { detail: ComplaintDetail }) {
  const { message } = App.useApp();
  const c = detail.complaint;
  const companies = useCompanies();
  const areaCompany = useActiveAssignments(dayjs().format('YYYY-MM-DD')).data?.find((a) => a.areaId === c.areaId);
  const forward = useForwardComplaint();
  const close = useCloseComplaint();
  const [form] = Form.useForm<{ companyId?: number; note?: string }>();

  return (
    <>
      {!c.forwardedCompanyId && (
        <>
          <Divider orientation="left">Chuyển công ty xử lý</Divider>
          {forward.error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={errorText(forward.error)} />}
          <Form
            form={form}
            layout="vertical"
            onFinish={(v) =>
              forward.mutate(
                { id: c.id, companyId: v.companyId, note: v.note?.trim() || undefined },
                { onSuccess: (d) => message.success(`Đã chuyển ${d.complaint.forwardedCompanyCode}, hạn ${dayjs(d.complaint.deadline).format('DD/MM/YYYY')}`) },
              )
            }
          >
            <Form.Item label="Công ty" name="companyId" extra="Hạn xử lý: hôm nay + 3 ngày">
              <Select
                allowClear
                placeholder={areaCompany ? `${areaCompany.companyCode} · phụ trách ${c.areaCode} (mặc định)` : 'Khu vực chưa có công ty'}
                options={(companies.data ?? []).map((co) => ({ value: co.id, label: `${co.code} · ${co.name}` }))}
              />
            </Form.Item>
            <Form.Item label="Ghi chú cho công ty" name="note">
              <Input.TextArea rows={2} maxLength={1000} />
            </Form.Item>
            <Button htmlType="submit" loading={forward.isPending}>
              Chuyển công ty
            </Button>
          </Form>
        </>
      )}
      <Divider orientation="left">Đóng khiếu nại</Divider>
      <TextActionForm
        label="Kết quả giải quyết"
        okText="Đóng khiếu nại"
        requiredMessage="Vui lòng ghi kết quả giải quyết"
        maxLength={2000}
        submitting={close.isPending}
        error={errorText(close.error)}
        onSubmit={(resolution) =>
          close.mutate({ id: c.id, resolution }, { onSuccess: () => message.success(`Đã đóng khiếu nại ${c.code}`) })
        }
      />
    </>
  );
}

/** Khiếu nại của cán bộ xã (§10 bước 6): danh sách, ghi nhận, chi tiết + timeline, chuyển công ty, đóng. */
export function CommuneComplaintsPage() {
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const openId = Number(params.get('id')) || null;
  const [filter, setFilter] = useState<Filter>('ALL');
  const [channel, setChannel] = useState<Complaint['channel']>();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const complaints = useComplaints();
  const areas = useAreas();
  const subjects = useQuery({
    queryKey: ['masterdata', 'subjects', 'complaint-options'],
    queryFn: () => api.get<SubjectPage>('/api/masterdata/subjects', { params: { page: 0, size: 500 } }),
    enabled: creating,
  });
  const create = useCreateComplaint();

  const open = (id: number | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === null) next.delete('id');
        else next.set('id', String(id));
        return next;
      },
      { replace: true },
    );

  const items = useMemo(() => complaints.data ?? [], [complaints.data]);
  const visible = useMemo(() => {
    const needle = normalizeText(q.trim());
    return items.filter((c) => {
      if (filter === 'OVERDUE' ? !c.overdue : filter !== 'ALL' && c.status !== filter) return false;
      if (channel && c.channel !== channel) return false;
      return !needle || normalizeText(`${c.code} ${c.complainantName} ${c.summary} ${c.subjectCode ?? ''} ${c.areaCode}`).includes(needle);
    });
  }, [items, filter, channel, q]);
  const count = (f: Filter) =>
    items.filter((c) => (f === 'ALL' ? true : f === 'OVERDUE' ? c.overdue : c.status === f)).length;

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Khiếu nại
        </Typography.Title>
        <Button type="primary" onClick={() => setCreating(true)}>
          + Ghi nhận khiếu nại
        </Button>
      </Space>
      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={(['ALL', 'NEW', 'PROCESSING', 'RESOLVED', 'OVERDUE'] as Filter[]).map((f) => ({
            value: f,
            label: `${f === 'ALL' ? 'Tất cả' : f === 'OVERDUE' ? 'Quá hạn' : COMPLAINT_STATUS_LABELS[f]} (${count(f)})`,
          }))}
        />
        <Select
          allowClear
          aria-label="Kênh"
          placeholder="Tất cả kênh"
          style={{ width: 200 }}
          value={channel}
          onChange={setChannel}
          options={(Object.keys(COMPLAINT_CHANNEL_LABELS) as Complaint['channel'][]).map((k) => ({ value: k, label: COMPLAINT_CHANNEL_LABELS[k] }))}
        />
        <Input.Search allowClear aria-label="Tìm khiếu nại" placeholder="Mã, tên, nội dung, mã hộ" value={q} onChange={(e) => setQ(e.target.value)} />
      </Space>
      {complaints.error && <Alert type="error" showIcon message={errorText(complaints.error)} style={{ marginBottom: 12 }} />}
      <Table<Complaint>
        rowKey="id"
        loading={complaints.isLoading}
        dataSource={visible}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'Không có khiếu nại phù hợp' }}
        onRow={(c) => ({ onClick: () => open(c.id), style: { cursor: 'pointer' } })}
        columns={[
          {
            title: 'Mã / ngày',
            render: (_, c) => (
              <>
                <div>{c.code}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  <DateText value={c.receivedDate} />
                </Typography.Text>
              </>
            ),
          },
          { title: 'Người khiếu nại', render: (_, c) => c.complainantName },
          { title: 'Tóm tắt', render: (_, c) => c.summary },
          { title: 'Kênh', render: (_, c) => COMPLAINT_CHANNEL_LABELS[c.channel] },
          { title: 'Khu vực · công ty', render: (_, c) => `${c.areaCode}${c.forwardedCompanyCode ? ` · ${c.forwardedCompanyCode}` : ''}` },
          {
            title: 'Trạng thái',
            render: (_, c) => (
              <Space size={4} wrap>
                <Tag color={COMPLAINT_STATUS_COLORS[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</Tag>
                {c.overdue && <Tag color="red">Quá hạn</Tag>}
              </Space>
            ),
          },
        ]}
      />
      <ComplaintDrawer id={openId} onClose={() => open(null)} actions={(d) => <CommuneActions detail={d} />} />
      <CreateComplaintForm
        open={creating}
        areas={(areas.data ?? []).map((a) => ({ id: a.id, code: a.code, name: a.name }))}
        subjects={(subjects.data?.items ?? []).map((s) => ({ id: s.id, code: s.code, name: s.name, areaId: s.areaId }))}
        submitting={create.isPending}
        error={errorText(create.error)}
        onCancel={() => {
          setCreating(false);
          create.reset();
        }}
        onSubmit={(req) =>
          create.mutate(req, {
            onSuccess: (d) => {
              message.success(`Đã ghi nhận khiếu nại ${d.complaint.code}`);
              setCreating(false);
              open(d.complaint.id);
            },
          })
        }
      />
    </>
  );
}
