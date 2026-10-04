-- Vị trí tổ trên bản đồ (điểm đại diện, WGS84). Null khi chưa đặt.
alter table areas
    add column latitude  double precision,
    add column longitude double precision,
    add constraint ck_areas_location check (
        (latitude is null and longitude is null)
        or (latitude between -90 and 90 and longitude between -180 and 180));

comment on column areas.latitude is 'Vĩ độ điểm đại diện của tổ; cán bộ xã kéo thả trên bản đồ để sửa';
comment on column areas.longitude is 'Kinh độ điểm đại diện của tổ';
