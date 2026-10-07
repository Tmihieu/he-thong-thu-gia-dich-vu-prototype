import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Modal, Select, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';

import { PageHeader } from '../../../shared/PageHeader';
import { StatusTag } from '../../../shared/StatusTag';
import { errorText } from '../../../shared/errorText';
import { filterNoMarks, normalizeText as fold } from '../../../shared/normalizeText';
import {
  type Area,
  type PendingStreetGroup,
  type Street,
  useAreas,
  useAutoMatchStreets,
  useLinkStreetGroup,
  useStreetPending,
  useStreets,
} from '../api';
import { ImportStreetsModal } from './ImportStreetsModal';
import { type StreetDraft, StreetFormModal } from './StreetFormModal';

/** Chuỗi tìm của một đường: tên hiển thị và tên cũ. */
const haystack = (s: Street) => fold([s.displayName, ...s.oldNames.map((o) => o.name)].join(' | '));

function areaNames(ids: number[], areas: Area[]) {
  return ids.map((id) => areas.find((a) => a.id === id)?.name ?? `#${id}`);
}

/** Màn "Danh mục đường" của quản trị viên (người của xã): danh mục đường/hẻm theo ấp và hồ sơ chờ xác minh. */
export function StreetsPage() {
  return (
    <>
      <PageHeader
        title="Danh mục đường"
        description="Đường, hẻm của xã theo ấp. Cán bộ xã chọn từ danh mục khi nhập hồ sơ hộ; chỉ quản trị viên thêm, sửa, đổi tên."
      />
      <Tabs
        items={[
          { key: 'catalog', label: 'Danh mục', children: <CatalogTab /> },
          { key: 'pending', label: 'Đường chờ xác minh', children: <PendingTab /> },
        ]}
      />
    </>
  );
}

function CatalogTab() {
  const streets = useStreets();
  const areas = useAreas();
  const all = streets.data ?? [];
  const areaList = areas.data ?? [];
  const [q, setQ] = useState('');
  const [areaId, setAreaId] = useState<number>();
  const [kind, setKind] = useState<Street['kind']>();
  const [editing, setEditing] = useState<Street | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  // Lọc theo ấp: hẻm theo ấp của đường cha.
  const inArea = (s: Street) => {
    if (areaId === undefined) return true;
    const owner = s.parentId ? all.find((p) => p.id === s.parentId) : s;
    return s.areaIds.includes(areaId) || !!owner?.areaIds.includes(areaId);
  };
  const rows = all.filter((s) => (!kind || s.kind === kind) && inArea(s) && (!q.trim() || haystack(s).includes(fold(q.trim()))));

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {streets.error && <Alert type="error" showIcon message={errorText(streets.error, 'Không tải được danh mục đường.')} />}
      <Space wrap>
        <Input.Search allowClear aria-label="Tìm đường" placeholder="Tên đường, hẻm hoặc tên cũ" style={{ width: 260 }} onChange={(e) => setQ(e.target.value)} />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          aria-label="Lọc ấp"
          placeholder="Tất cả ấp"
          style={{ width: 160 }}
          value={areaId}
          onChange={setAreaId}
          options={areaList.map((a) => ({ value: a.id, label: a.name }))}
        />
        <Select
          allowClear
          aria-label="Lọc loại"
          placeholder="Đường và hẻm"
          style={{ width: 140 }}
          value={kind}
          onChange={setKind}
          options={[{ value: 'STREET', label: 'Đường' }, { value: 'ALLEY', label: 'Hẻm' }]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
          Thêm đường / hẻm
        </Button>
        <Button icon={<UploadOutlined />} onClick={() => setImporting(true)}>
          Nhập từ Excel
        </Button>
      </Space>
      <Table<Street>
        rowKey="id"
        size="small"
        loading={streets.isLoading}
        dataSource={rows}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showTotal: (n) => `${n} đường/hẻm` }}
        columns={[
          {
            title: 'Tên',
            render: (_, s) => (
              <Space size={4}>
                {s.kind === 'ALLEY' && <Tag>Hẻm</Tag>}
                <span>{s.displayName}</span>
              </Space>
            ),
          },
          {
            title: 'Ấp đi qua',
            render: (_, s) => {
              const names = areaNames(s.areaIds, areaList);
              if (!names.length) return <Typography.Text type="secondary">{s.parentId ? 'Theo đường' : '—'}</Typography.Text>;
              return names.length > 4 ? <Tooltip title={names.join(', ')}>{`${names.slice(0, 4).join(', ')} +${names.length - 4}`}</Tooltip> : names.join(', ');
            },
          },
          {
            title: 'Tên cũ',
            render: (_, s) =>
              s.oldNames.map((o) => (
                <Tooltip key={o.name} title={o.note ?? undefined}>
                  <Tag>{o.name}</Tag>
                </Tooltip>
              )),
          },
          {
            title: 'Trạng thái',
            width: 120,
            render: (_, s) => (s.status === 'ACTIVE' ? <StatusTag color="green">Đang dùng</StatusTag> : <StatusTag>Ngừng dùng</StatusTag>),
          },
          {
            title: 'Thao tác',
            align: 'right',
            width: 90,
            render: (_, s) => (
              <Button size="small" type="link" aria-label={`Sửa ${s.displayName}`} onClick={() => setEditing(s)}>
                Sửa
              </Button>
            ),
          },
        ]}
      />
      <Typography.Text type="secondary">
        Dữ liệu đường ban đầu lấy từ{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap
        </a>{' '}
        và đã được xã duyệt.
      </Typography.Text>
      <StreetFormModal open={adding} areas={areaList} catalog={all} onClose={() => setAdding(false)} />
      <StreetFormModal open={!!editing} street={editing ?? undefined} areas={areaList} catalog={all} onClose={() => setEditing(null)} />
      <ImportStreetsModal open={importing} onClose={() => setImporting(false)} />
    </Space>
  );
}

/** Gợi sẵn loại/đường cha từ tên cán bộ đã ghi: "Hẻm 99 Đặng Thúc Vịnh" → hẻm trên Đặng Thúc Vịnh. */
function draftOf(g: PendingStreetGroup, all: Street[], areas: Area[]): StreetDraft {
  const areaIds = areas.filter((a) => g.areaNames.includes(a.name)).map((a) => a.id);
  const text = fold(g.name);
  const parent = /^hem\b/.test(text)
    ? all.find((s) => s.kind === 'STREET' && [s.name, ...s.oldNames.map((o) => o.name)].some((n) => text.endsWith(` ${fold(n)}`)))
    : undefined;
  return parent ? { name: g.name, kind: 'ALLEY', parentId: parent.id, areaIds: [] } : { name: g.name, kind: 'STREET', areaIds };
}

function PendingTab() {
  const { message } = App.useApp();
  const pending = useStreetPending();
  const streets = useStreets();
  const areas = useAreas();
  const autoMatch = useAutoMatchStreets();
  const link = useLinkStreetGroup();
  const all = streets.data ?? [];
  const [linking, setLinking] = useState<PendingStreetGroup | null>(null);
  const [target, setTarget] = useState<number>();
  const [adding, setAdding] = useState<PendingStreetGroup | null>(null);

  const linkTo = (group: PendingStreetGroup, streetId: number) =>
    link.mutate(
      { key: group.key, streetId },
      {
        onSuccess: (r) => {
          void message.success(`Đã gắn ${r.count} hồ sơ vào danh mục.`);
          setLinking(null);
          setTarget(undefined);
        },
        onError: (e) => void message.error(errorText(e)),
      },
    );

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Hồ sơ hộ chưa gắn đường trong danh mục: địa chỉ cũ và hồ sơ cán bộ ghi "chờ xác minh", gộp theo tên đường đã ghi.
        Kiểm tra đường/hẻm có thật rồi gắn vào đường có sẵn hoặc thêm mới vào danh mục; mọi hộ trong nhóm được gắn một lần.
      </Typography.Paragraph>
      <Space>
        <Button
          loading={autoMatch.isPending}
          onClick={() =>
            autoMatch.mutate(undefined, {
              onSuccess: (r) => void message.success(`Đã tự gắn ${r.matched} hồ sơ; còn ${r.remaining} hồ sơ cần xử lý.`),
              onError: (e) => void message.error(errorText(e)),
            })
          }
        >
          Tự khớp hồ sơ cũ theo tên
        </Button>
        <Typography.Text type="secondary">Chỉ gắn khi tên ghi khớp đúng một đường/hẻm (kể cả tên cũ).</Typography.Text>
      </Space>
      {pending.error && <Alert type="error" showIcon message={errorText(pending.error, 'Không tải được danh sách.')} />}
      <Table<PendingStreetGroup>
        rowKey="key"
        size="small"
        loading={pending.isLoading}
        dataSource={pending.data ?? []}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'Mọi hồ sơ đã gắn đường trong danh mục.' }}
        columns={[
          { title: 'Tên đường đã ghi', dataIndex: 'name' },
          {
            title: 'Số hộ',
            width: 170,
            render: (_, g) => (
              <Space size={4}>
                <span>{g.subjectCount}</span>
                {g.pendingCount > 0 ? <Tag color="orange">{g.pendingCount} chờ xác minh</Tag> : <Tag>địa chỉ cũ</Tag>}
              </Space>
            ),
          },
          { title: 'Ấp', render: (_, g) => g.areaNames.join(', ') },
          { title: 'Mã hộ', render: (_, g) => g.sampleCodes.join(', ') + (g.subjectCount > g.sampleCodes.length ? ', …' : '') },
          {
            title: 'Thao tác',
            align: 'right',
            render: (_, g) => (
              <Space size={0}>
                <Button size="small" type="link" onClick={() => setLinking(g)}>
                  Gắn vào đường có sẵn
                </Button>
                <Button size="small" type="link" onClick={() => setAdding(g)}>
                  Thêm vào danh mục
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={`Gắn "${linking?.name ?? ''}" vào đường có sẵn`}
        open={!!linking}
        destroyOnHidden
        onCancel={() => {
          setLinking(null);
          setTarget(undefined);
        }}
        okText={`Gắn ${linking?.subjectCount ?? 0} hồ sơ`}
        cancelText="Hủy"
        okButtonProps={{ disabled: !target }}
        confirmLoading={link.isPending}
        onOk={() => linking && target && linkTo(linking, target)}
      >
        <Select<number>
          aria-label="Đường / hẻm trong danh mục"
          showSearch
          filterOption={filterNoMarks}
          placeholder="Tìm tên đường, hẻm hoặc tên cũ"
          style={{ width: '100%' }}
          value={target}
          onChange={setTarget}
          options={all
            .filter((s) => s.status === 'ACTIVE')
            .map((s) => ({
              value: s.id,
              label: s.oldNames.length ? `${s.displayName} (tên cũ: ${s.oldNames.map((o) => o.name).join(', ')})` : s.displayName,
            }))}
        />
      </Modal>
      <StreetFormModal
        open={!!adding}
        draft={adding ? draftOf(adding, all, areas.data ?? []) : undefined}
        areas={areas.data ?? []}
        catalog={all}
        onClose={() => setAdding(null)}
        onSaved={(s) => adding && linkTo(adding, s.id)}
      />
    </Space>
  );
}
