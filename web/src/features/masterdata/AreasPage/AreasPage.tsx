import { App, Button, Checkbox, Select, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import {
  type Area,
  type AreaAssignment,
  useActiveAssignments,
  useAreas,
  useAssignAreas,
  useCompanies,
  useDistricts,
} from '../api';
import { AssignAreaModal } from './AssignAreaModal';
import { AssignmentHistoryDrawer } from './AssignmentHistoryDrawer';

interface Row extends Area {
  assignment?: AreaAssignment;
}

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

/** Khu vực của cán bộ xã: 24 tổ, công ty đang phụ trách, lọc chưa có công ty, phân công, lịch sử. */
export function AreasPage() {
  const { message } = App.useApp();
  const today = dayjs().format('YYYY-MM-DD');
  const areas = useAreas();
  const districts = useDistricts();
  const companies = useCompanies();
  const active = useActiveAssignments(today);
  const assign = useAssignAreas();

  const [districtId, setDistrictId] = useState<number | undefined>();
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [modalAreas, setModalAreas] = useState<number[] | null>(null);
  const [historyArea, setHistoryArea] = useState<Area | null>(null);

  const rows = useMemo<Row[]>(() => {
    const byArea = new Map((active.data ?? []).map((a) => [a.areaId, a]));
    return (areas.data ?? [])
      .map((a) => ({ ...a, assignment: byArea.get(a.id) }))
      .filter((r) => districtId === undefined || r.districtId === districtId)
      .filter((r) => !unassignedOnly || !r.assignment);
  }, [areas.data, active.data, districtId, unassignedOnly]);

  const unassignedCount = (areas.data ?? []).filter((a) => !(active.data ?? []).some((x) => x.areaId === a.id)).length;

  function openModal(areaIds: number[]) {
    assign.reset();
    setModalAreas(areaIds);
  }

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Khu vực
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Mỗi tổ có một công ty phụ trách trong cùng thời gian hiệu lực. Phân công mới tự kết thúc phân công cũ và giữ
        lịch sử. {unassignedCount > 0 && <Tag color="orange">{unassignedCount} tổ chưa có công ty</Tag>}
      </Typography.Paragraph>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          aria-label="Địa bàn"
          allowClear
          placeholder="Tất cả địa bàn"
          style={{ width: 200 }}
          value={districtId}
          onChange={setDistrictId}
          options={(districts.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
        />
        <Checkbox checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)}>
          Chỉ tổ chưa có công ty
        </Checkbox>
        <Button type="primary" disabled={selected.length === 0} onClick={() => openModal(selected)}>
          Phân công {selected.length > 0 ? `(${selected.length} tổ)` : ''}
        </Button>
      </Space>
      <Table<Row>
        rowKey="id"
        loading={areas.isLoading || active.isLoading}
        dataSource={rows}
        pagination={false}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys as number[]) }}
        locale={{ emptyText: errorMessage(areas.error ?? active.error) ?? 'Không có khu vực phù hợp' }}
        columns={[
          {
            title: 'Khu vực',
            render: (_, r) => (
              <Button type="link" style={{ padding: 0 }} onClick={() => setHistoryArea(r)}>
                {r.code} · {r.name}
              </Button>
            ),
          },
          { title: 'Địa bàn', dataIndex: 'districtCode' },
          {
            title: 'Công ty phụ trách',
            render: (_, r) =>
              r.assignment ? `${r.assignment.companyCode} · ${r.assignment.companyName}` : <Tag color="orange">Chưa có công ty</Tag>,
          },
          {
            title: 'Hiệu lực',
            render: (_, r) =>
              r.assignment ? (
                <>
                  <DateText value={r.assignment.validFrom} /> –{' '}
                  {r.assignment.validTo ? <DateText value={r.assignment.validTo} /> : 'không thời hạn'}
                </>
              ) : (
                '—'
              ),
          },
          {
            title: '',
            render: (_, r) => (
              <Button size="small" onClick={() => openModal([r.id])} aria-label={`Phân công ${r.code}`}>
                {r.assignment ? 'Đổi công ty' : 'Phân công'}
              </Button>
            ),
          },
        ]}
      />
      <AssignAreaModal
        open={modalAreas !== null}
        areas={areas.data ?? []}
        companies={companies.data ?? []}
        initialAreaIds={modalAreas ?? []}
        submitting={assign.isPending}
        error={errorMessage(assign.error)}
        onCancel={() => setModalAreas(null)}
        onSubmit={(req) =>
          assign.mutate(req, {
            onSuccess: (created) => {
              message.success(`Đã phân công ${created.length} tổ cho ${created[0]?.companyCode ?? ''}`);
              setModalAreas(null);
              setSelected([]);
            },
          })
        }
      />
      <AssignmentHistoryDrawer area={historyArea} onClose={() => setHistoryArea(null)} />
    </>
  );
}
