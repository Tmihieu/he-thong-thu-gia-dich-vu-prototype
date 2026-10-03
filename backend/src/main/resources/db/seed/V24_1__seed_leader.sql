-- Seed demo (chỉ profile demo): tài khoản lãnh đạo (T54). Dữ liệu giả; mật khẩu chung ở docs/demo-accounts.md.
insert into users (username, full_name, phone, organization, role, password_hash) values
    ('lanhdao', 'Trần Văn Mẫu (lãnh đạo)', '0900000102', 'UBND xã Đông Thạnh', 'LEADER',
     '$2a$10$qYVcLstgB6vCbc0EAJRp.OSlcYdvI2m2Z3p91RHqRPqeg5zWIaEKy');
