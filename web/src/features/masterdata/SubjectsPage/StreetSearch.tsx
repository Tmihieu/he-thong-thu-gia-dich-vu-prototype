import { Alert, Button, Input, Select, Spin, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { type StreetSuggestions, suggestStreets } from '../api';

/** Giá trị của ô chọn đường: đường chuẩn (có streetId), đường chờ xác minh (pending) hoặc địa chỉ cũ chưa chuẩn hóa. */
export interface StreetValue {
  streetId?: number;
  /** Tên đường chuẩn, hoặc tên tạm (chờ xác minh / địa chỉ cũ). */
  street: string;
  pending: boolean;
  districtId?: number;
  /** Tên xã/phường của đường chuẩn, để phân biệt đường trùng tên. */
  districtName?: string;
}

interface Props {
  /** Xã/phường của tổ/ấp đang chọn; có thì chỉ tìm đường của xã/phường đó. */
  districtId?: number;
  value?: StreetValue;
  onChange?: (value: StreetValue | undefined) => void;
}

const DEBOUNCE_MS = 350;
const MIN_CHARS = 2;

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

/**
 * Ô tìm đường: gõ rồi chọn từ danh mục chuẩn (gọi backend sau {@link DEBOUNCE_MS} ms, bỏ yêu cầu và phản hồi cũ khi
 * đổi từ khóa). Kết quả Goong chỉ để tham khảo: chọn nó chỉ ghi nhận "chờ xác minh", không tự thêm đường vào danh mục.
 */
export function StreetSearch({ districtId, value, onChange }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<StreetSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const mine = ++latest.current;
    const q = text.trim();
    if (q.length < MIN_CHARS) {
      setResult(null);
      setLoading(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      suggestStreets(q, districtId, controller.signal)
        .then((r) => {
          if (mine === latest.current) {
            setResult(r);
            setFailed(false);
          }
        })
        .catch((err: unknown) => {
          if (mine === latest.current && !isAbort(err)) {
            setResult(null);
            setFailed(true);
          }
        })
        .finally(() => {
          if (mine === latest.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, districtId]);

  if (value?.pending) {
    return (
      <>
        <Input
          aria-label="Tên đường chờ xác minh"
          maxLength={200}
          value={value.street}
          onChange={(e) => onChange?.({ street: e.target.value, pending: true })}
        />
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 8 }}
          message="Đường chưa có trong danh mục: hồ sơ được ghi nhận chờ xác minh. Hệ thống không tự thêm đường mới."
          action={
            <Button size="small" type="link" onClick={() => onChange?.(undefined)}>
              Tìm lại trong danh mục
            </Button>
          }
        />
      </>
    );
  }

  const legacy = value && !value.streetId;
  const streetOptions = (result?.streets ?? []).map((s) => ({ value: `s:${s.id}`, label: `${s.name} · ${s.districtName}` }));
  const external = (result?.external ?? []).map((e) => ({ value: `g:${e.placeId}`, label: `${e.name} · ${e.secondaryText}` }));
  const options = [
    ...streetOptions,
    ...(external.length ? [{ label: 'Gợi ý tham khảo từ Goong · chưa có trong danh mục', options: external }] : []),
  ];

  function choose(picked?: { value: string }) {
    if (!picked) return onChange?.(undefined);
    if (picked.value.startsWith('s:')) {
      const s = result?.streets.find((x) => `s:${x.id}` === picked.value);
      if (s) onChange?.({ streetId: s.id, street: s.name, pending: false, districtId: s.districtId, districtName: s.districtName });
    } else {
      const e = result?.external.find((x) => `g:${x.placeId}` === picked.value);
      if (e) onChange?.({ street: e.name, pending: true });
    }
  }

  const goongDown = result?.goongStatus === 'REJECTED' || result?.goongStatus === 'UNAVAILABLE';
  const notFound = loading ? (
    <Spin size="small" />
  ) : failed ? (
    'Không tìm được đường lúc này. Thử lại, hoặc ghi nhận chờ xác minh.'
  ) : text.trim().length < MIN_CHARS ? (
    `Gõ ít nhất ${MIN_CHARS} ký tự`
  ) : (
    'Không có đường nào trong danh mục khớp.'
  );

  return (
    <>
      <Select<{ value: string; label: string }>
        aria-label="Đường / hẻm"
        showSearch
        allowClear
        labelInValue
        filterOption={false}
        placeholder="Gõ tên đường rồi chọn trong danh sách"
        value={
          value?.streetId
            ? { value: `s:${value.streetId}`, label: value.districtName ? `${value.street} · ${value.districtName}` : value.street }
            : undefined
        }
        loading={loading}
        options={options}
        notFoundContent={notFound}
        onSearch={setText}
        onChange={choose}
      />
      {legacy && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 8 }}
          message={`Địa chỉ cũ chưa chuẩn hóa: "${value.street}". Chọn đường trong danh mục để chuẩn hóa, hoặc giữ nguyên.`}
        />
      )}
      {goongDown && (
        <Typography.Text type="secondary" style={{ display: 'block' }}>
          Gợi ý từ Goong tạm thời không dùng được; vẫn tìm được trong danh mục nội bộ.
        </Typography.Text>
      )}
      {!value?.streetId && (
        <Button type="link" style={{ padding: 0 }} onClick={() => onChange?.({ street: text.trim(), pending: true })}>
          Không tìm thấy đường? Ghi nhận chờ xác minh
        </Button>
      )}
    </>
  );
}
