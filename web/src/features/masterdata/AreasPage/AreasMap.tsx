import 'leaflet/dist/leaflet.css';
import './AreasMap.css';

import { App, Button, Space, Switch, Tag, Typography } from 'antd';
import L, { type LatLngTuple, type LeafletEvent, type Marker as LeafletMarker } from 'leaflet';
import { useMemo, useState } from 'react';
import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip } from 'react-leaflet';

import { ApiError } from '../../../api/client';
import { type Area, type AreaAssignment, useMoveArea } from '../api';
import hamlets from './dongThanhHamlets.json';

export interface MapArea extends Area {
  assignment?: AreaAssignment;
}

interface Props {
  areas: MapArea[];
  /** Tên địa bàn theo mã, để hiện trong popup. */
  districtNames: Map<string, string>;
  /** Ấp bị bộ lọc của trang loại ra: vẫn vẽ nhưng mờ đi. */
  isDimmed: (area: MapArea) => boolean;
  onAssign: (areaId: number) => void;
  onHistory: (area: Area) => void;
}

interface HamletFeature {
  properties: { ap?: number; commune?: boolean };
  geometry: { coordinates: number[][][] };
}

// Ranh giới xã Đông Thạnh và 52 ấp từ OpenStreetMap (© OpenStreetMap contributors, ODbL), đã làm gọn tọa độ.
const features = (hamlets as { features: HamletFeature[] }).features;
const toRings = (f: HamletFeature) => f.geometry.coordinates.map((ring) => ring.map(([lon, lat]) => [lat, lon] as LatLngTuple));
const communeRings = features.filter((f) => f.properties.commune).flatMap(toRings);
const hamletRings = new Map(
  features.filter((f) => f.properties.ap).map((f) => [`AP${String(f.properties.ap).padStart(2, '0')}`, toRings(f)]),
);
const communeBounds = L.latLngBounds(communeRings.flat());

/** Vị trí ghim: điểm đã lưu, chưa có thì lấy giữa ranh giới ấp (kéo thả để lưu). */
function pinPosition(a: Area): LatLngTuple | undefined {
  if (a.latitude != null && a.longitude != null) return [a.latitude, a.longitude];
  const rings = hamletRings.get(a.code);
  if (!rings) return undefined;
  const c = L.latLngBounds(rings.flat()).getCenter();
  return [c.lat, c.lng];
}

const UNASSIGNED = '#fa8c16';
const PALETTE = ['#1677ff', '#52c41a', '#722ed1', '#13c2c2', '#eb2f96', '#2f54eb', '#389e0d', '#9254de', '#08979c',
  '#c41d7f', '#1d39c4', '#7cb305'];
const companyColor = (companyId: number) => PALETTE[companyId % PALETTE.length] ?? UNASSIGNED;
const colorOf = (a: MapArea) => (a.assignment ? companyColor(a.assignment.companyId) : UNASSIGNED);

const icons = new Map<string, L.DivIcon>();
function pinIcon(label: string, color: string, dimmed: boolean, editing: boolean): L.DivIcon {
  const key = [label, color, dimmed, editing].join('|');
  let icon = icons.get(key);
  if (!icon) {
    const cls = ['vsmt-area-pin', dimmed && 'vsmt-area-pin--dimmed', editing && 'vsmt-area-pin--editing'].filter(Boolean);
    icon = L.divIcon({
      className: 'vsmt-area-icon',
      iconSize: [28, 28],
      html: `<div class="${cls.join(' ')}" style="background:${color}">${label}</div>`,
    });
    icons.set(key, icon);
  }
  return icon;
}

/** Bản đồ OpenStreetMap của trang Khu vực: ranh giới ấp tô màu theo công ty phụ trách, cán bộ xã kéo điểm để dời vị trí. */
export function AreasMap({ areas, districtNames, isDimmed, onAssign, onHistory }: Props) {
  const { message } = App.useApp();
  const move = useMoveArea();
  const [editing, setEditing] = useState(false);

  const companies = useMemo(() => {
    const seen = new Map<number, AreaAssignment>();
    areas.forEach((a) => a.assignment && seen.set(a.assignment.companyId, a.assignment));
    return [...seen.values()].sort((x, y) => x.companyCode.localeCompare(y.companyCode));
  }, [areas]);

  function onDragEnd(area: MapArea, e: LeafletEvent) {
    const marker = e.target as LeafletMarker;
    const { lat, lng } = marker.getLatLng();
    move.mutate(
      { id: area.id, latitude: +lat.toFixed(6), longitude: +lng.toFixed(6) },
      {
        onSuccess: () => message.success(`Đã dời vị trí ${area.name}`),
        onError: (err) => {
          if (area.latitude != null && area.longitude != null) marker.setLatLng([area.latitude, area.longitude]);
          message.error(err instanceof ApiError ? err.message : 'Không dời được vị trí. Vui lòng thử lại.');
        },
      },
    );
  }

  function popup(a: MapArea) {
    return (
      <Popup>
        <Typography.Text strong>
          {a.code} · {a.name}
        </Typography.Text>
        <div>
          Địa bàn {districtNames.get(a.districtCode) ?? a.districtCode} · {a.subjectCount} hộ
        </div>
        <div style={{ margin: '4px 0 8px' }}>
          {a.assignment ? (
            `${a.assignment.companyCode} · ${a.assignment.companyName}`
          ) : (
            <Tag color="orange">Chưa có công ty</Tag>
          )}
        </div>
        <Space>
          {!a.assignment && (
            <Button size="small" type="primary" onClick={() => onAssign(a.id)}>
              Phân công
            </Button>
          )}
          <Button size="small" onClick={() => onHistory(a)}>
            Lịch sử
          </Button>
        </Space>
      </Popup>
    );
  }

  return (
    <>
      <Space wrap style={{ marginBottom: 8, justifyContent: 'space-between', width: '100%' }}>
        <Space wrap size={[12, 4]}>
          {companies.map((c) => (
            <span key={c.companyId} className="vsmt-map-legend" title={c.companyName}>
              <i style={{ background: companyColor(c.companyId) }} />
              {c.companyCode}
            </span>
          ))}
          <span className="vsmt-map-legend">
            <i style={{ background: UNASSIGNED }} />
            Chưa có công ty
          </span>
        </Space>
        <Space>
          <Switch size="small" checked={editing} onChange={setEditing} aria-label="Sửa vị trí ấp" />
          <Typography.Text type="secondary">{editing ? 'Kéo điểm ấp đến vị trí mới' : 'Sửa vị trí ấp'}</Typography.Text>
        </Space>
      </Space>
      <MapContainer bounds={communeBounds} scrollWheelZoom={false} style={{ height: 480, borderRadius: 8 }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <Polygon
          positions={communeRings}
          interactive={false}
          pathOptions={{ color: '#262626', weight: 3, fill: false, dashArray: '6 4' }}
        />
        {areas.map((a) => {
          const rings = hamletRings.get(a.code);
          if (!rings) return null;
          const dimmed = isDimmed(a);
          return (
            <Polygon
              key={`poly-${a.id}`}
              positions={rings}
              pathOptions={{ color: colorOf(a), weight: 1.5, fillOpacity: dimmed ? 0.04 : 0.3, opacity: dimmed ? 0.3 : 1 }}
            >
              <Tooltip sticky>
                {a.name} · {a.assignment ? a.assignment.companyCode : 'chưa có công ty'}
              </Tooltip>
              {popup(a)}
            </Polygon>
          );
        })}
        {areas.map((a) => {
          const position = pinPosition(a);
          if (!position) return null;
          const label = a.name.match(/\d+$/)?.[0] ?? a.code;
          return (
            <Marker
              key={`pin-${a.id}`}
              position={position}
              draggable={editing}
              icon={pinIcon(label, colorOf(a), isDimmed(a), editing)}
              title={a.name}
              eventHandlers={{ dragend: (e) => onDragEnd(a, e) }}
            >
              {popup(a)}
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
}
