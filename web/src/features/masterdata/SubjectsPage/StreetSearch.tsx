import { Alert, Button, Input, Select, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { type StreetSuggestions, suggestStreets } from '../api';

/** Giá trị của ô chọn đường: đường/hẻm chuẩn (có streetId), đường chờ xác minh (pending) hoặc địa chỉ cũ chưa chuẩn hóa. */
export interface StreetValue {
  streetId?: number;
  /** Tên hiển thị của đường/hẻm chuẩn (hẻm kèm tên đường), hoặc tên tạm (chờ xác minh / địa chỉ cũ). */
  street: string;
  pending: boolean;
}

interface Props {
  value?: StreetValue;
  onChange?: (value: StreetValue | undefined) => void;
}

const DEBOUNCE_MS = 350;
const MIN_CHARS = 2;

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

/**
 * Ô tìm đường cả xã (đường ở ấp khác, tên cũ): gõ rồi chọn từ danh mục chuẩn (gọi backend sau {@link DEBOUNCE_MS} ms, bỏ yêu cầu và phản hồi cũ khi
 * đổi từ khóa). Không có đường thì ghi nhận "chờ xác minh", không tự thêm đường vào danh mục.
 */
export function StreetSearch({ value, onChange }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<StreetSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const mine = ++latest.current;
    const q = text.trim();
    if (q.length < MIN_CHARS) {
      /* eslint-disable react-hooks/set-state-in-effect -- đặt lại trạng thái khi từ khóa ngắn / bắt đầu gọi yêu cầu có debounce */
      setResult(null);
      setLoading(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const timer = setTimeout(() => {
      suggestStreets(q, controller.signal)
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
  }, [text]);

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
  const streetOptions = (result?.streets ?? []).map((s) => ({ value: `s:${s.id}`, label: s.displayName }));
  const options = streetOptions;

  function choose(picked?: { value: string }) {
    if (!picked) return onChange?.(undefined);
    const s = result?.streets.find((x) => `s:${x.id}` === picked.value);
    if (s) onChange?.({ streetId: s.id, street: s.displayName, pending: false });
  }

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
        placeholder="Gõ tên đường, hẻm hoặc tên cũ rồi chọn"
        value={
          value?.streetId ? { value: `s:${value.streetId}`, label: value.street } : undefined
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
      {!value?.streetId && (
        <Button type="link" style={{ padding: 0 }} onClick={() => onChange?.({ street: text.trim(), pending: true })}>
          Không tìm thấy đường? Ghi nhận chờ xác minh
        </Button>
      )}
    </>
  );
}
