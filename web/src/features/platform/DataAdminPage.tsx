/** Jmix chạy như service riêng, nginx / proxy Vite đưa ra cùng domain tại /jmix nên nhúng được bằng iframe. */
export const JMIX_ADMIN_URL = '/jmix/';

export function DataAdminPage() {
  return (
    <iframe
      title="Quản trị dữ liệu (Jmix)"
      src={JMIX_ADMIN_URL}
      style={{ width: '100%', height: 'calc(100vh - 160px)', minHeight: 480, border: 0, background: '#fff' }}
    />
  );
}
