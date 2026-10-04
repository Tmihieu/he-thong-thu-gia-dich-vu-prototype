import { App, Button, Card, Checkbox, Select, Skeleton, Space, Table } from 'antd';
import dayjs from 'dayjs';
import { lazy, Suspense, useMemo, useState } from 'react';

import { errorTextOrNull } from '../../../shared/errorText';
import { StatusTag } from '../../../shared/StatusTag';
import { PageHeader } from '../../../shared/PageHeader';
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

// Leaflet nặng và chỉ màn này dùng: tách chunk riêng.
const AreasMap = lazy(() => import('./AreasMap').then((m) => ({ default: m.AreasMap })));

/** Khu vực của cán bộ xã: bản đồ + bảng các ấp, công ty đang phụ trách, lọc chưa có công ty, phân công ấp chưa có công ty, lịch sử. */
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

  const allRows = useMemo<Row[]>(() => {
    const byArea = new Map((active.data ?? []).map((a) => [a.areaId, a]));
    return (areas.data ?? []).map((a) => ({ ...a, assignment: byArea.get(a.id) }));
  }, [areas.data, active.data]);
  const matches = (r: Row) =>
    (districtId === undefined || r.districtId === districtId) && (!unassignedOnly || !r.assignment);
  const rows = allRows.filter(matches);
  const districtNames = useMemo(() => new Map((districts.data ?? []).map((d) => [d.code, d.name])), [districts.data]);

  const unassigned = (areas.data ?? []).filter((a) => !(active.data ?? []).some((x) => x.areaId === a.id));
  const unassignedCount = unassigned.length;

  function openModal(areaIds: number[]) {
    assign.reset();
    setModalAreas(areaIds);
  }

  return (
    <>
      <PageHeader
        title="Khu vực"
        description={
          <>
            Mỗi ấp có một công ty phụ trách trong cùng thời gian hiệu lực. Chỉ phân công được ấp chưa có công ty phụ
            trách. {unassignedCount > 0 && <StatusTag color="orange">{unassignedCount} ấp chưa có công ty</StatusTag>}
          </>
        }
      />
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
          Chỉ ấp chưa có công ty
        </Checkbox>
      </Space>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Suspense fallback={<Skeleton.Node active style={{ width: '100%', height: 480 }} />}>
          <AreasMap
            areas={allRows}
            districtNames={districtNames}
            isDimmed={(a) => !matches(a)}
            onAssign={(id) => openModal([id])}
            onHistory={setHistoryArea}
          />
        </Suspense>
      </Card>
      <Table<Row>
        rowKey="id"
        loading={areas.isLoading || active.isLoading}
        dataSource={rows}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as number[]),
          getCheckboxProps: (r) => ({ disabled: !!r.assignment }),
        }}
        locale={{ emptyText: errorTextOrNull(areas.error ?? active.error) ?? 'Không có khu vực phù hợp' }}
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
          { title: 'Số hộ', dataIndex: 'subjectCount', align: 'right' },
          {
            title: 'Công ty phụ trách',
            render: (_, r) =>
              r.assignment ? `${r.assignment.companyCode} · ${r.assignment.companyName}` : <StatusTag color="orange">Chưa có công ty</StatusTag>,
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
            render: (_, r) =>
              !r.assignment && (
                <Button size="small" type="link" onClick={() => openModal([r.id])} aria-label={`Phân công ${r.code}`}>
                  Phân công
                </Button>
              ),
          },
        ]}
      />
      <AssignAreaModal
        open={modalAreas !== null}
        areas={unassigned}
        companies={(companies.data ?? []).filter((c) => c.status === 'ACTIVE')}
        initialAreaIds={modalAreas ?? []}
        submitting={assign.isPending}
        error={errorTextOrNull(assign.error)}
        onCancel={() => setModalAreas(null)}
        onSubmit={(req) =>
          assign.mutate(req, {
            onSuccess: (created) => {
              message.success(`Đã phân công ${created.length} ấp cho ${created[0]?.companyCode ?? ''}`);
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
