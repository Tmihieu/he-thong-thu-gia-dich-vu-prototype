import { homePath, MENU, menuPath, visibleMenu, ROLE_BASE, ROLE_LABELS, ROLES } from './menuConfig';

describe('menuConfig', () => {
  it('có đúng 5 vai trò nội bộ (thêm Lãnh đạo 29/09/2026), không có người dân', () => {
    expect(ROLES).toEqual(['COMMUNE_OFFICER', 'COMPANY_MANAGER', 'COLLECTOR', 'ADMIN', 'LEADER']);
    expect(ROLE_LABELS.COMMUNE_OFFICER).toBe('Cán bộ xã');
  });

  it('menu mỗi vai trò khớp danh mục màn hình của prototype (inventory §3)', () => {
    const labels = (role: keyof typeof MENU) => visibleMenu(role).map((e) => e.label);
    expect(labels('COMMUNE_OFFICER')).toEqual([
      'Hồ sơ hộ',
      'Khoản thu',
      'Khu vực',
      'Công ty',
      'Tiến độ thu',
      'Đối soát',
      'Khiếu nại',
      'Đề nghị',
      'Chợ cộng đồng',
    ]);
    expect(labels('COMPANY_MANAGER')).toEqual(['Khu vực được giao', 'Khiếu nại', 'Chợ cộng đồng']);
    expect(labels('COLLECTOR')).toEqual(['Danh sách thu', 'Tiền mặt', 'Tài khoản', 'Chợ cộng đồng']);
    expect(labels('ADMIN')).toEqual(['Tài khoản', 'Cấu hình', 'Nhật ký']);
    expect(labels('LEADER')).toEqual(['Dashboard', 'Chờ duyệt', 'Báo cáo tổng hợp', 'Tiến độ thu', 'Đối soát', 'Chợ cộng đồng']);
  });

  it('đường dẫn menu nằm dưới gốc của vai trò và không trùng', () => {
    for (const role of ROLES) {
      const paths = MENU[role].map((e) => menuPath(role, e));
      expect(new Set(paths).size).toBe(paths.length);
      paths.forEach((p) => expect(p.startsWith(ROLE_BASE[role] + '/')).toBe(true));
    }
    const bases = Object.values(ROLE_BASE);
    expect(new Set(bases).size).toBe(bases.length);
  });

  it('trang chính là mục menu đầu tiên', () => {
    expect(homePath('COMMUNE_OFFICER')).toBe('/commune/subjects');
    expect(homePath('COMPANY_MANAGER')).toBe('/company/assigned');
    expect(homePath('COLLECTOR')).toBe('/collector/list');
    expect(homePath('ADMIN')).toBe('/admin/accounts');
    expect(homePath('LEADER')).toBe('/leader/dashboard');
  });
});
