import { DatePicker, Input, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { errorText } from '../../../shared/errorText';
import { PageHeader } from '../../../shared/PageHeader';
import type { Role } from '../../../app/auth/authContext';
import { ROLE_LABELS } from '../../../app/layout/menuConfig';
import { DateText } from '../../../shared/DateText';
import { type AuditLog, type AuditLogQuery, useAuditLogs } from '../api';
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from '../labels';
import { type AuditDiffRow, auditDiff } from './auditFormat';

/** Vai trò chỉ có trong nhật ký, không phải vai trò đăng nhập web. */
const EXTRA_ROLE_LABELS: Record<string, string> = { SYSTEM: 'Hệ thống', CITIZEN: 'Người dân' };

function roleLabel(role: string): string {
  return EXTRA_ROLE_LABELS[role] ?? ROLE_LABELS[role as Role] ?? role;
}

function BeforeAfter({ log }: { log: AuditLog }) {
  const rows = auditDiff(log.beforeData, log.afterData);
  if (rows === null) {
    return (
      <Typography.Paragraph type="secondary" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {[log.beforeData, log.afterData].filter(Boolean).join(' / ')}
      </Typography.Paragraph>
    );
  }
  if (rows.length === 0) return <Typography.Text type="secondary">Không có trường nào thay đổi.</Typography.Text>;
  return (
    <Table<AuditDiffRow>
      size="small"
      rowKey="key"
      pagination={false}
      dataSource={rows}
      columns={[
        { title: 'Trường', dataIndex: 'label', width: 220 },
        { title: 'Trước', dataIndex: 'before' },
        { title: 'Sau', dataIndex: 'after' },
      ]}
    />
  );
}

/** Nhật ký thao tác của quản trị: lọc theo ngày/người/hành động, mở một dòng để xem dữ liệu trước/sau. */
export function AuditLogPage() {
  const [query, setQuery] = useState<AuditLogQuery>({ page: 0, size: 20 });
  const logs = useAuditLogs(query);

  return (
    <>
      <PageHeader title="Nhật ký" description="Lịch sử thao tác của người dùng trong hệ thống." />
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']}
          onChange={(range) =>
            setQuery((prev) => ({
              ...prev,
              from: range?.[0]?.format('YYYY-MM-DD'),
              to: range?.[1]?.format('YYYY-MM-DD'),
              page: 0,
            }))
          }
        />
        <Input.Search
          aria-label="Lọc theo người thao tác"
          placeholder="Tên đăng nhập"
          allowClear
          style={{ width: 200 }}
          onSearch={(v) => setQuery((prev) => ({ ...prev, actorUsername: v.trim() || undefined, page: 0 }))}
        />
        <Select
          aria-label="Lọc theo hành động"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Mọi hành động"
          style={{ width: 280 }}
          onChange={(action?: string) => setQuery((prev) => ({ ...prev, action, page: 0 }))}
          options={Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </Space>
      <Table<AuditLog>
        rowKey="id"
        loading={logs.isFetching}
        dataSource={logs.data?.items ?? []}
        locale={{ emptyText: logs.error ? errorText(logs.error) : 'Không có dòng nhật ký phù hợp' }}
        expandable={{ expandedRowRender: (log) => <BeforeAfter log={log} /> }}
        pagination={{
          current: query.page + 1,
          pageSize: query.size,
          total: logs.data?.total ?? 0,
          showSizeChanger: false,
          showTotal: (total) => `${total} dòng`,
          onChange: (page) => setQuery((prev) => ({ ...prev, page: page - 1 })),
        }}
        columns={[
          { title: 'Thời gian', dataIndex: 'occurredAt', className: 'cell-nowrap', render: (v: string) => <DateText value={v} withTime /> },
          { title: 'Người thao tác', dataIndex: 'actorUsername' },
          { title: 'Vai trò', dataIndex: 'actorRole', render: roleLabel },
          {
            title: 'Hành động',
            dataIndex: 'action',
            render: (a: string) => <span>{AUDIT_ACTION_LABELS[a] ?? a}</span>,
          },
          {
            title: 'Đối tượng',
            render: (_, log) => `${AUDIT_ENTITY_LABELS[log.entityType] ?? log.entityType} · ${log.entityId}`,
          },
          { title: 'IP', dataIndex: 'ipAddress', render: (ip: string | null) => ip ?? '—' },
        ]}
      />
    </>
  );
}
