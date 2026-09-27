-- Seed demo (chỉ profile demo): tài khoản app người dân GIẢ, SĐT lấy từ hộ giả của V7_1.
-- DTH-H000128 (KV07, DV01) là hộ của kịch bản demo §10; có thêm tài khoản thành viên thứ hai (D11).
-- Các hộ khác phủ đủ trường hợp: tổ khác của DV01 (KV09), công ty khác (KV12 · DV07), địa bàn NB, hộ miễn 100%.
-- OTP cố định lấy từ cấu hình vsmt.citizen.demo-otp (docs/demo-accounts.md).

insert into citizen_accounts (phone, subject_id, display_name)
select s.phone, s.id, s.name
from service_subjects s
where s.code in ('DTH-H000128', 'TTT-H000161', 'TTT-H000221', 'NB-H000341', 'DTH-H000149');

insert into citizen_accounts (phone, subject_id, display_name)
select '0903000128', s.id, 'Thành viên hộ ' || s.code
from service_subjects s
where s.code = 'DTH-H000128';
