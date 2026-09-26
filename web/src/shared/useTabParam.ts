import { useSearchParams } from 'react-router';

/** Tab đang mở lấy từ `?tab=` (để thông báo mở đúng tab); đổi tab thì cập nhật URL, không thêm lịch sử. */
export function useTabParam(keys: readonly string[], fallback: string): [string, (key: string) => void] {
  const [params, setParams] = useSearchParams();
  const current = params.get('tab');
  const active = current && keys.includes(current) ? current : fallback;
  const setActive = (key: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', key);
        return next;
      },
      { replace: true },
    );
  return [active, setActive];
}
