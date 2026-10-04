-- Chuẩn hóa địa chỉ: danh mục đường nội bộ theo xã/phường (nguồn chuẩn), hồ sơ hộ liên kết bằng street_id.
-- Goong chỉ là dịch vụ tham khảo: không lưu nội dung do Goong trả, chỉ giữ place_id (id tham chiếu) khi cán bộ đối chiếu.

create table streets (
    id              bigint generated always as identity primary key,
    district_id     bigint       not null references districts (id),
    name            varchar(200) not null,
    name_key        varchar(200) not null,
    status          varchar(30)  not null default 'ACTIVE',
    goong_place_id  varchar(600),

    created_at      timestamptz  not null default now(),
    created_by      bigint references users (id),
    updated_at      timestamptz  not null default now(),
    updated_by      bigint references users (id),
    version         integer      not null default 0,

    constraint uq_streets_district_key unique (district_id, name_key),
    constraint ck_streets_status check (status in ('ACTIVE', 'INACTIVE'))
);

-- street_id null = địa chỉ cũ chưa chuẩn hóa hoặc đường chưa có trong danh mục (street_pending); không tự gán.
alter table service_subjects
    add column street_id       bigint references streets (id),
    add column street_pending  boolean not null default false,
    add column unit_no         varchar(30),
    add column location_note   varchar(255);

create index ix_service_subjects_street on service_subjects (area_id, street_id);

comment on column service_subjects.street is 'Tên đường hiển thị: theo streets.name khi có street_id, ngược lại là văn bản cán bộ nhập (cũ/chờ xác minh)';
comment on column service_subjects.street_pending is 'Cán bộ không tìm thấy đường trong danh mục, ghi tên tạm và chờ xác minh';
