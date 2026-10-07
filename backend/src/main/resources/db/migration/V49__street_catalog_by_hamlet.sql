-- Danh mục đường/hẻm chung cả xã Đông Thạnh (sau sáp nhập 01/7/2025): một đường dài đi qua nhiều ấp, kể cả ấp của
-- các xã cũ khác nhau, nên đường không còn thuộc một địa bàn (xã cũ) mà gắn với các ấp nó đi qua.
-- Hẻm là con của một đường. Tên cũ (đổi tên theo văn bản, vd. NQ 380/NQ-HĐND 24/7/2025) vẫn tìm được.
-- Chỉ quản trị viên (người của xã) sửa danh mục; cán bộ xã chọn khi nhập hồ sơ.

create table street_areas (
    street_id  bigint not null references streets (id) on delete cascade,
    area_id    bigint not null references areas (id),
    primary key (street_id, area_id)
);

create index ix_street_areas_area on street_areas (area_id);

-- Giữ phạm vi cũ: đường của địa bàn nào thì gắn mọi ấp của địa bàn đó.
insert into street_areas (street_id, area_id)
select s.id, a.id from streets s join areas a on a.district_id = s.district_id;

-- Đường trùng tên ở hai địa bàn cũ là cùng một đường của xã mới: gộp về id nhỏ nhất.
create temporary table street_dupes on commit drop as
select id, min(id) over (partition by name_key) as keep_id from streets;

update service_subjects ss set street_id = d.keep_id
from street_dupes d where ss.street_id = d.id and d.id <> d.keep_id;

insert into street_areas (street_id, area_id)
select d.keep_id, sa.area_id from street_areas sa join street_dupes d on d.id = sa.street_id
where d.id <> d.keep_id
on conflict do nothing;

delete from streets s using street_dupes d where s.id = d.id and d.id <> d.keep_id;

-- Bỏ địa bàn và id Goong: đường thuộc cả xã; Goong chỉ còn là gợi ý tham khảo, không lưu gì của Goong.
alter table streets
    drop constraint uq_streets_district_key,
    drop column district_id,
    drop column goong_place_id,
    add column kind       varchar(10) not null default 'STREET',
    add column parent_id  bigint references streets (id),
    add constraint ck_streets_kind check (kind in ('STREET', 'ALLEY')),
    add constraint ck_streets_alley_parent check ((kind = 'ALLEY') = (parent_id is not null));

-- Tên đường là duy nhất trong xã; tên hẻm ("Hẻm 19") duy nhất trong một đường.
create unique index uq_streets_parent_key on streets (coalesce(parent_id, 0), name_key);
create index ix_streets_parent on streets (parent_id);

create table street_old_names (
    id          bigint generated always as identity primary key,
    street_id   bigint       not null references streets (id) on delete cascade,
    name        varchar(200) not null,
    name_key    varchar(200) not null,
    -- Văn bản đổi tên, vd. "NQ 380/NQ-HĐND ngày 24/7/2025".
    note        varchar(255),
    created_at  timestamptz  not null default now(),
    created_by  bigint references users (id),

    constraint uq_street_old_names unique (street_id, name_key)
);

create index ix_street_old_names_key on street_old_names (name_key);

comment on column streets.name is 'Tên đường; với hẻm là tên ngắn ("Hẻm 19"), tên hiển thị ghép thêm tên đường cha';
comment on column service_subjects.street is 'Tên đường hiển thị: theo danh mục (hẻm kèm tên đường) khi có street_id, ngược lại là văn bản cán bộ nhập (cũ/chờ xác minh)';
