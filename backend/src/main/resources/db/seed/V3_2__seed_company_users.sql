-- Seed demo (chỉ profile demo): mỗi công ty một tài khoản COMPANY_MANAGER dv01…dv11.
-- Mật khẩu giả chung ghi ở docs/demo-accounts.md; họ tên = người đầu mối của công ty.

insert into users (username, full_name, phone, organization, role, company_id, password_hash)
select lower(c.code), c.contact_name, c.contact_phone, c.name, 'COMPANY_MANAGER', c.id,
       '$2a$10$2gNNNvSfsPQSGXK.r0Cpted0JhUz/XNCMWLNVYXNAulubq8mPxaZC'
from companies c
order by c.code;
