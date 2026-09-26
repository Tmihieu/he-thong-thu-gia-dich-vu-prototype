import { Alert, App, Button, Popconfirm, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { useActiveAssignments } from '../../masterdata/api';
import {
  type CollectorAssignment,
  useAssignCollector,
  useCollectorAssignments,
  useCollectors,
  useEndCollectorAssignment,
} from '../api';
import { type AreaOption, AssignCollectorForm } from './AssignCollectorForm';

interface Row extends AreaOption {
  assignment: CollectorAssignment | undefined;
}

function errorText(e: unknown) {
  return e ? (e instanceof ApiError ? e.message : 'Không thực hiện được. Vui lòng thử lại.') : null;
}

/** "Phân tổ": các tổ công ty đang phụ trách → người đi thu hiện tại; gán / đổi / kết thúc. */
export function CollectorAssignPage() {
  const { message } = App.useApp();
  const today = dayjs().format('YYYY-MM-DD');
  const areas = useActiveAssignments(today);
  const assignments = useCollectorAssignments();
  const collectors = useCollectors();
  const assign = useAssignCollector();
  const end = useEndCollectorAssignment();
  const [editing, setEditing] = useState<number[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const rows = useMemo<Row[]>(
    () =>
      (areas.data ?? [])
        .map((a) => ({
          id: a.areaId,
          code: a.areaCode,
          name: a.areaName,
          assignment: (assignments.data ?? []).find((c) => c.areaId === a.areaId),
        }))
        .sort((x, y) => x.code.localeCompare(y.code)),
    [areas.data, assignments.data],
  );
  const editingCollector =
    editing && editing.length === 1 ? rows.find((r) => r.id === editing[0])?.assignment?.collectorId : undefined;
  const loadError = areas.error ?? assignments.error ?? collectors.error;

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" disabled={selected.length === 0} onClick={() => setEditing(selected)}>
          Phân tổ đã chọn ({selected.length})
        </Button>
      </Space>
      {loadError && <Alert type="error" showIcon message={errorText(loadError)} style={{ marginBottom: 12 }} />}
      {end.error && <Alert type="error" showIcon role="alert" message={errorText(end.error)} style={{ marginBottom: 12 }} />}
      <Table<Row>
        rowKey="id"
        loading={areas.isLoading || assignments.isLoading}
        dataSource={rows}
        pagination={false}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as number[]) }}
        locale={{ emptyText: 'Công ty chưa được giao tổ nào' }}
        columns={[
          { title: 'Tổ', render: (_, r) => `${r.code} · ${r.name}` },
          {
            title: 'Người đi thu',
            render: (_, r) =>
              r.assignment ? (
                <>
                  {r.assignment.collectorName}
                  <Typography.Text type="secondary"> · {r.assignment.collectorUsername}</Typography.Text>
                </>
              ) : (
                <Typography.Text type="danger">Chưa phân</Typography.Text>
              ),
          },
          { title: 'Từ ngày', render: (_, r) => (r.assignment ? <DateText value={r.assignment.validFrom} /> : '—') },
          {
            title: '',
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => setEditing([r.id])} aria-label={`Phân tổ ${r.code}`}>
                  {r.assignment ? 'Đổi' : 'Gán'}
                </Button>
                {r.assignment && (
                  <Popconfirm
                    title={`Kết thúc phân tổ ${r.code} từ hôm nay?`}
                    okText="Kết thúc"
                    cancelText="Hủy"
                    onConfirm={() =>
                      end.mutate(
                        { id: r.assignment!.id, endDate: today },
                        { onSuccess: () => message.success(`Đã kết thúc phân tổ ${r.code}`) },
                      )
                    }
                  >
                    <Button size="small" danger>
                      Kết thúc
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
      <AssignCollectorForm
        open={editing !== null}
        areas={rows}
        collectors={collectors.data ?? []}
        initialAreaIds={editing ?? []}
        initialCollectorId={editingCollector}
        submitting={assign.isPending}
        error={errorText(assign.error)}
        onCancel={() => {
          setEditing(null);
          assign.reset();
        }}
        onSubmit={(req) =>
          assign.mutate(req, {
            onSuccess: (r) => {
              message.success(`Đã phân ${r.length} tổ cho ${r[0]?.collectorName ?? ''}`);
              setEditing(null);
              setSelected([]);
            },
          })
        }
      />
    </>
  );
}
