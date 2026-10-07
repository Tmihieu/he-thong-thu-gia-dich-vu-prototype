import { Button, Col, Row, Select, Space } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { filterNoMarks } from '../../../shared/normalizeText';
import { type Street, useStreets } from '../api';
import { StreetSearch, type StreetValue } from './StreetSearch';

interface Props {
  /** Ấp đang chọn: chỉ hiện đường đi qua ấp này. */
  areaId?: number;
  value?: StreetValue;
  onChange?: (value: StreetValue | undefined) => void;
}

/** "Mặt đường": nhà không nằm trong hẻm. */
const NO_ALLEY = 0;

/** Nhãn kèm tên cũ để gõ tên cũ (vd. "Đông Thạnh 8") vẫn lọc ra đường. */
function label(s: Street) {
  return s.oldNames.length ? `${s.name} (tên cũ: ${s.oldNames.map((o) => o.name).join(', ')})` : s.name;
}

/**
 * Chọn địa chỉ từ tổng quát đến chi tiết: ấp (ô riêng của form) → đường đi qua ấp → hẻm của đường → số nhà (ô riêng).
 * Nhà giáp ranh ở đường của ấp khác, hoặc đường/hẻm chưa có trong danh mục: chuyển sang ô tìm cả xã / ghi nhận chờ xác minh.
 */
export function StreetPicker({ areaId, value, onChange }: Props) {
  const catalog = useStreets();
  const all = catalog.data ?? [];
  const picked = value?.streetId ? all.find((s) => s.id === value.streetId) : undefined;
  const street = picked?.kind === 'ALLEY' ? all.find((s) => s.id === picked.parentId) : picked;
  const alley = picked?.kind === 'ALLEY' ? picked : undefined;
  // Địa chỉ cũ / chờ xác minh, hoặc người dùng chọn tìm cả xã.
  const [searching, setSearching] = useState(!!value && !value.streetId);

  // Đổi ấp mà đường đang chọn không đi qua ấp mới thì bỏ chọn (không xóa khi mở hồ sơ nhà giáp ranh).
  const lastArea = useRef(areaId);
  useEffect(() => {
    if (lastArea.current === areaId) return;
    lastArea.current = areaId;
    if (street && areaId !== undefined && !street.areaIds.includes(areaId) && !searching) onChange?.(undefined);
  }, [areaId, street, searching, onChange]);

  if (searching) {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <StreetSearch value={value} onChange={onChange} />
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => {
            setSearching(false);
            onChange?.(undefined);
          }}
        >
          Chọn lại theo ấp
        </Button>
      </Space>
    );
  }

  const usable = (s: Street) => s.status === 'ACTIVE' || s.id === street?.id || s.id === alley?.id;
  const streetOptions = all
    .filter((s) => s.kind === 'STREET' && usable(s) && (s.id === street?.id || (areaId !== undefined && s.areaIds.includes(areaId))))
    .map((s) => ({ value: s.id, label: label(s) }));
  const alleys = street ? all.filter((s) => s.parentId === street.id && usable(s)) : [];
  const alleyOptions = [{ value: NO_ALLEY, label: 'Mặt đường (không trong hẻm)' }, ...alleys.map((s) => ({ value: s.id, label: label(s) }))];

  const choose = (s: Street | undefined) => onChange?.(s ? { streetId: s.id, street: s.displayName, pending: false } : undefined);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Row gutter={8}>
        <Col xs={24} md={14}>
          <Select<number>
            aria-label="Đường"
            showSearch
            allowClear
            filterOption={filterNoMarks}
            loading={catalog.isLoading}
            disabled={areaId === undefined}
            placeholder={areaId === undefined ? 'Chọn ấp trước' : 'Chọn đường đi qua ấp'}
            notFoundContent="Ấp này chưa có đường trong danh mục"
            options={streetOptions}
            value={street?.id}
            onChange={(id) => choose(all.find((s) => s.id === id))}
          />
        </Col>
        <Col xs={24} md={10}>
          <Select<number>
            aria-label="Hẻm"
            showSearch
            filterOption={filterNoMarks}
            disabled={!street}
            placeholder={street ? 'Mặt đường hoặc chọn hẻm' : 'Chọn đường trước'}
            options={alleyOptions}
            value={street ? (alley?.id ?? NO_ALLEY) : undefined}
            onChange={(id) => choose(id === NO_ALLEY ? street : all.find((s) => s.id === id))}
          />
        </Col>
      </Row>
      <Button
        type="link"
        style={{ padding: 0 }}
        onClick={() => {
          setSearching(true);
          onChange?.(undefined);
        }}
      >
        Không thấy đường/hẻm? Tìm cả xã hoặc ghi nhận chờ xác minh
      </Button>
    </Space>
  );
}
