import { Image, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { api } from '../api/client';

/**
 * Ảnh cần token nên không gắn thẳng đường dẫn vào `<img>`: tải Blob kèm Bearer, hiện qua object URL, thu hồi khi gỡ.
 * ponytail: ảnh nhỏ tải nguyên ảnh gốc (≤ 5 MB/ảnh); nếu bảng chậm thì thêm ảnh thu nhỏ ở backend.
 */
export function AuthImage({ path, alt, size = 48 }: { path: string; alt: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    let url: string | null = null;
    api.blob(path, { signal: abort.signal }).then(
      (blob) => {
        if (abort.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      },
      () => {
        if (!abort.signal.aborted) setFailed(true);
      },
    );
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);
  if (failed) return <Typography.Text type="secondary">Không tải được ảnh</Typography.Text>;
  if (!src) return <Spin size="small" />;
  return <Image src={src} alt={alt} width={size} height={size} style={{ objectFit: 'cover', borderRadius: 4 }} />;
}
