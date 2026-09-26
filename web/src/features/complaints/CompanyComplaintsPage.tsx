import { Alert, App, Divider, Segmented, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { ApiError } from '../../api/client';
import { DateText } from '../../shared/DateText';
import { type Complaint, type ComplaintDetail, useComplaints, useReplyComplaint } from './api';
import { ComplaintDrawer } from './ComplaintDrawer';
import { TextActionForm } from './ComplaintForms';
import { COMPLAINT_STATUS_COLORS, COMPLAINT_STATUS_LABELS } from './labels';

type Filter = 'OPEN' | 'OVERDUE' | 'RESOLVED' | 'ALL';

function errorText(e: unknown) {
  return e ? (e instanceof ApiError ? e.message : 'Không thực hiện được. Vui lòng thử lại.') : null;
}

function ReplyAction({ detail }: { detail: ComplaintDetail }) {
  const { message } = App.useApp();
  const reply = useReplyComplaint();
  const c = detail.complaint;
  return (
    <>
      <Divider orientation="left">Phản hồi về xã</Divider>
      <TextActionForm
        label="Kết quả xử lý của công ty"
        okText="Gửi phản hồi"
        requiredMessage="Vui lòng nhập nội dung phản hồi"
        maxLength={2000}
        submitting={reply.isPending}
        error={errorText(reply.error)}
        onSubmit={(content) =>
          reply.mutate({ id: c.id, content }, { onSuccess: () => message.success(`Đã gửi phản hồi ${c.code} về xã`) })
        }
      />
    </>
  );
}

/** "Giải quyết khiếu nại" của công ty: chỉ khiếu nại xã đã chuyển (G12), quá hạn tính từ hạn, phản hồi về xã. */
export function CompanyComplaintsPage() {
  const [params, setParams] = useSearchParams();
  const openId = Number(params.get('id')) || null;
  const [filter, setFilter] = useState<Filter>('OPEN');
  const complaints = useComplaints();
  const items = useMemo(() => complaints.data ?? [], [complaints.data]);
  const match = (c: Complaint, f: Filter) =>
    f === 'ALL' || (f === 'OPEN' ? c.status !== 'RESOLVED' : f === 'OVERDUE' ? c.overdue : c.status === 'RESOLVED');
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
  const labels: Record<Filter, string> = { OPEN: 'Cần xử lý', OVERDUE: 'Quá hạn', RESOLVED: 'Đã giải quyết', ALL: 'Tất cả' };

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Giải quyết khiếu nại
      </Typography.Title>
      <Segmented<Filter>
        style={{ marginBottom: 12 }}
        value={filter}
        onChange={setFilter}
        options={(Object.keys(labels) as Filter[]).map((f) => ({ value: f, label: `${labels[f]} (${items.filter((c) => match(c, f)).length})` }))}
      />
      {complaints.error && <Alert type="error" showIcon message={errorText(complaints.error)} style={{ marginBottom: 12 }} />}
      <Table<Complaint>
        rowKey="id"
        loading={complaints.isLoading}
        dataSource={items.filter((c) => match(c, filter))}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'Không có khiếu nại được chuyển' }}
        onRow={(c) => ({ onClick: () => open(c.id), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Khu vực', dataIndex: 'areaCode' },
          { title: 'Tóm tắt', dataIndex: 'summary' },
          { title: 'Hạn xử lý', dataIndex: 'deadline', render: (d: string | null) => <DateText value={d} /> },
          {
            title: 'Trạng thái',
            render: (_, c) => (
              <Space size={4} wrap>
                <Tag color={COMPLAINT_STATUS_COLORS[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</Tag>
                {c.overdue && <Tag color="red">Quá hạn xử lý</Tag>}
              </Space>
            ),
          },
        ]}
      />
      <ComplaintDrawer id={openId} onClose={() => open(null)} actions={(d) => <ReplyAction detail={d} />} />
    </>
  );
}
