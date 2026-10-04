import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '../../shared/PageHeader';
import { ErrorBlock, LoadingBlock } from '../../shared/StateBlock';

/** Jmix chạy như service riêng, nginx / proxy Vite đưa ra cùng domain tại /jmix nên nhúng được bằng iframe. */
export const JMIX_ADMIN_URL = '/jmix/';

/** Dịch vụ Jmix không chạy thì proxy trả 5xx hoặc cổng đóng: báo rõ thay vì khung trắng. */
async function checkJmix(): Promise<true> {
  const res = await fetch(JMIX_ADMIN_URL, { method: 'GET' });
  if (!res.ok) throw new Error(`Jmix trả mã ${res.status}`);
  return true;
}

export function DataAdminPage() {
  const jmix = useQuery({ queryKey: ['platform', 'jmix-health'], queryFn: checkJmix, retry: false });
  return (
    <>
      <PageHeader title="Quản trị dữ liệu" description="Công cụ Jmix xem và sửa trực tiếp dữ liệu nền của hệ thống." />
      {jmix.isLoading && <LoadingBlock rows={2} />}
      {jmix.isError && (
        <ErrorBlock
          error={new Error('Dịch vụ quản trị dữ liệu (Jmix) hiện không chạy hoặc chưa kết nối được. Hãy bật dịch vụ rồi thử lại.')}
          onRetry={() => void jmix.refetch()}
        />
      )}
      {jmix.isSuccess && (
        <iframe
          title="Quản trị dữ liệu (Jmix)"
          src={JMIX_ADMIN_URL}
          style={{ width: '100%', height: 'calc(100vh - 220px)', minHeight: 480, border: 0, borderRadius: 12, background: '#fff' }}
        />
      )}
    </>
  );
}
