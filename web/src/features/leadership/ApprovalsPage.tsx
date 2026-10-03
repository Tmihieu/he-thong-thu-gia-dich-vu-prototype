import { Alert, App, Button, Form, Input, Modal, Segmented, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { errorTextOrNull } from '../../shared/errorText';
import { StatusTag } from '../../shared/StatusTag';
import { PageHeader } from '../../shared/PageHeader';
import { useAuth } from '../../app/auth/authContext';
import { DateText } from '../../shared/DateText';
import { MoneyText } from '../../shared/MoneyText';
import {
  type Approval,
  APPROVAL_STATUS_COLORS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_TYPE_LABELS,
  type ApprovalStatus,
  type ApprovalType,
  useApprovals,
  useDecideApproval,
} from './api';

const periodLabel = (code: string | null) => (code ? code.split('-').reverse().join('/') : '');

/** Nội dung đề nghị: miễn giảm theo đăng ký thu phí; hoàn / xóa nợ theo khoản. */
function Target({ a }: { a: Approval }) {
  return (
    <>
      <div>
        {a.subjectName} <Typography.Text type="secondary">· {a.subjectCode}</Typography.Text>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {a.type === 'EXEMPTION' ? (
          <>Miễn 100%</>
        ) : (
          <>
            {a.chargeCode} · kỳ {periodLabel(a.periodCode)} · {a.companyCode} · khoản <MoneyText value={a.chargeAmount} />
          </>
        )}
      </Typography.Text>
    </>
  );
}

interface Deciding {
  approval: Approval;
  approve: boolean;
}

/**
 * Đề nghị miễn giảm / hoàn / xóa nợ (SPEC §9.10). Lãnh đạo: hàng chờ duyệt, Duyệt / Từ chối từng dòng (từ chối bắt
 * buộc ý kiến). Cán bộ xã: theo dõi đề nghị đã lập (lập ở màn Khoản thu; miễn giảm tự tạo khi bật cờ trên đăng ký thu phí).
 */
export function ApprovalsPage() {
  const { user } = useAuth();
  const leader = user?.role === 'LEADER';
  const [status, setStatus] = useState<ApprovalStatus | 'ALL'>(leader ? 'PENDING' : 'ALL');
  const [type, setType] = useState<ApprovalType>();
  const [deciding, setDeciding] = useState<Deciding | null>(null);
  const approvals = useApprovals(status === 'ALL' ? undefined : status, type);

  return (
    <>
      <PageHeader title={leader ? 'Chờ duyệt' : 'Đề nghị miễn giảm / hoàn / xóa nợ'} />
      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented<ApprovalStatus | 'ALL'>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'PENDING', label: 'Chờ duyệt' },
            { value: 'APPROVED', label: 'Đã duyệt' },
            { value: 'REJECTED', label: 'Từ chối' },
            { value: 'ALL', label: 'Tất cả' },
          ]}
        />
        <Select<ApprovalType>
          allowClear
          aria-label="Loại đề nghị"
          placeholder="Mọi loại"
          style={{ width: 170 }}
          value={type}
          onChange={setType}
          options={(Object.keys(APPROVAL_TYPE_LABELS) as ApprovalType[]).map((t) => ({ value: t, label: APPROVAL_TYPE_LABELS[t] }))}
        />
      </Space>
      {approvals.error && <Alert type="error" showIcon message={errorTextOrNull(approvals.error)} style={{ marginBottom: 12 }} />}
      <Table<Approval>
        size="small"
        rowKey="id"
        loading={approvals.isLoading}
        dataSource={approvals.data ?? []}
        pagination={{ pageSize: 30, hideOnSinglePage: true, showTotal: (t) => `${t} đề nghị` }}
        locale={{ emptyText: status === 'PENDING' ? 'Không có đề nghị chờ duyệt' : 'Chưa có đề nghị' }}
        columns={[
          {
            title: 'Mã / ngày',
            render: (_, a) => (
              <>
                <div style={{ fontWeight: 600 }}>{a.code}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  <DateText value={a.requestedAt} />
                </Typography.Text>
              </>
            ),
          },
          { title: 'Loại', render: (_, a) => <StatusTag>{APPROVAL_TYPE_LABELS[a.type]}</StatusTag> },
          { title: 'Hộ / khoản', render: (_, a) => <Target a={a} /> },
          {
            title: 'Số tiền',
            align: 'right',
            render: (_, a) =>
              a.type === 'REFUND' ? (
                <>
                  hoàn <MoneyText value={a.amount} strong />
                </>
              ) : a.type === 'WRITE_OFF' ? (
                <MoneyText value={a.chargeAmount} strong />
              ) : (
                '—'
              ),
          },
          {
            title: 'Lý do',
            render: (_, a) => (
              <>
                <div>{a.reason}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {a.requestedByName}
                  {a.decisionNo ? ` · VB ${a.decisionNo}` : ''}
                </Typography.Text>
              </>
            ),
          },
          {
            title: 'Kết quả',
            render: (_, a) => (
              <>
                <StatusTag color={APPROVAL_STATUS_COLORS[a.status]}>{APPROVAL_STATUS_LABELS[a.status]}</StatusTag>
                {a.decisionNote && (
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    {a.decisionNote}
                  </Typography.Text>
                )}
                {a.effectivePeriodCode && a.effectivePeriodCode !== a.periodCode && (
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    ghi nhận kỳ {periodLabel(a.effectivePeriodCode)}
                  </Typography.Text>
                )}
              </>
            ),
          },
          ...(leader
            ? [
                {
                  title: '',
                  render: (_: unknown, a: Approval) =>
                    a.status === 'PENDING' ? (
                      <Space>
                        <Button size="small" type="primary" onClick={() => setDeciding({ approval: a, approve: true })} aria-label={`Duyệt ${a.code}`}>
                          Duyệt
                        </Button>
                        <Button size="small" danger onClick={() => setDeciding({ approval: a, approve: false })} aria-label={`Từ chối ${a.code}`}>
                          Từ chối
                        </Button>
                      </Space>
                    ) : null,
                },
              ]
            : []),
        ]}
      />
      <DecisionModal deciding={deciding} onClose={() => setDeciding(null)} />
    </>
  );
}

const CONSEQUENCE: Record<ApprovalType, [string, string]> = {
  EXEMPTION: ['Ghi nhận miễn 100% xã đã bật cho hộ.', 'Bỏ cờ miễn; khoản Miễn giảm của kỳ chưa khóa quay về Chưa thu.'],
  REFUND: ['Ghi khoản hoàn, số "đã thu" của công ty giảm tương ứng. Công ty trả lại tiền cho hộ.', 'Không thay đổi số liệu.'],
  WRITE_OFF: ['Khoản chuyển "Đã xóa nợ", không còn tính vào số công ty phải thu / phải nộp.', 'Không thay đổi số liệu.'],
};

function DecisionModal({ deciding, onClose }: { deciding: Deciding | null; onClose: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ note?: string }>();
  const decide = useDecideApproval();
  const a = deciding?.approval;
  const approve = deciding?.approve ?? true;

  function close() {
    decide.reset();
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      open={deciding !== null}
      title={a ? `${approve ? 'Duyệt' : 'Từ chối'} ${APPROVAL_TYPE_LABELS[a.type].toLowerCase()} · ${a.code}` : ''}
      okText={approve ? 'Duyệt' : 'Từ chối'}
      okButtonProps={{ danger: !approve }}
      cancelText="Hủy"
      confirmLoading={decide.isPending}
      onOk={() => form.submit()}
      onCancel={close}
      destroyOnHidden
    >
      {decide.error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={errorTextOrNull(decide.error)} />}
      {a && (
        <>
          <Target a={a} />
          <Alert type={approve ? 'info' : 'warning'} style={{ margin: '12px 0' }} message={CONSEQUENCE[a.type][approve ? 0 : 1]} />
        </>
      )}
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(v) =>
          decide.mutate(
            { id: a!.id, approve, note: v.note?.trim() || undefined },
            {
              onSuccess: (r) => {
                message.success(`${r.code} ${approve ? 'đã duyệt' : 'đã từ chối'}`);
                close();
              },
            },
          )
        }
      >
        <Form.Item
          name="note"
          label="Ý kiến lãnh đạo"
          rules={approve ? [] : [{ required: true, whitespace: true, message: 'Từ chối phải ghi ý kiến' }]}
        >
          <Input.TextArea rows={3} maxLength={1000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
