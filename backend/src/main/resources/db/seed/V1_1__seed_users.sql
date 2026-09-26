-- Seed demo (chỉ profile demo). Dữ liệu giả; mật khẩu ghi ở docs/demo-accounts.md.
-- Tài khoản công ty seed ở T09 (V3_1), người đi thu ở T20 (V9_1).

insert into users (username, full_name, phone, organization, role, password_hash) values
    ('admin',    'Quản trị hệ thống', '0900000100', 'UBND xã Đông Thạnh', 'ADMIN',
     '$2a$10$q3.zE9qAlkojQoaN2L6kj.U/.KMfphZjF2Nn/PGF/of1rbqQM4woq'),
    ('canbo_xa', 'Nguyễn Thị Mẫu',    '0900000101', 'Phòng Kinh tế',      'COMMUNE_OFFICER',
     '$2a$10$qYVcLstgB6vCbc0EAJRp.OSlcYdvI2m2Z3p91RHqRPqeg5zWIaEKy');
