-- Dữ liệu dân cư theo yêu cầu của xã (28/09/2026): tách địa chỉ thành số nhà + đường; hộ gia đình bắt buộc
-- số thành viên (quyết định nhóm giá ≤2 / ≥3 người). Cột address giữ làm địa chỉ ghép để hiển thị và tìm kiếm.

alter table service_subjects
    add column house_no varchar(30),
    add column street   varchar(200);

-- Tách dữ liệu cũ: "Số 12 đường Mẫu" → "Số 12" + "đường Mẫu"; không nhận ra số nhà thì cả chuỗi là đường.
update service_subjects
set house_no = substring(address from '^((?:Số |Lô )?[0-9][^ ]*) '),
    street   = coalesce(substring(address from '^(?:Số |Lô )?[0-9][^ ]* (.+)$'), address);

alter table service_subjects
    alter column street set not null,
    add constraint ck_service_subjects_household_members
        check (subject_type <> 'HOUSEHOLD' or member_count is not null);

comment on column service_subjects.address is 'Ghép từ house_no + street khi lưu; chỉ đọc';
