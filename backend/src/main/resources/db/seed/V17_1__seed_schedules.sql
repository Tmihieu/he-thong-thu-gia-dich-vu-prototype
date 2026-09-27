-- Seed demo (chỉ profile demo): lịch thu gom giả cho cả 24 tổ, khác nhau theo địa bàn.
-- Địa bàn DTH lấy đúng lịch của prototype (CITIZEN_SCHEDULE: thứ 3 – 5 – 7, Chủ nhật đầu tháng rác cồng kềnh).

insert into collection_schedules (area_id, weekday, week_of_month, start_time, end_time, waste_type, note)
select a.id, s.weekday, s.week_of_month, s.start_time, s.end_time, s.waste_type, s.note
from areas a
join districts d on d.id = a.district_id
join (values
    ('DTH', 2, null::integer, time '17:00', time '19:00', 'HOUSEHOLD',            null),
    ('DTH', 4, null,          time '17:00', time '19:00', 'HOUSEHOLD',            null),
    ('DTH', 6, null,          time '17:00', time '19:00', 'HOUSEHOLD_RECYCLABLE', null),
    ('DTH', 7, 1,             time '08:00', time '11:00', 'BULKY',                'Chỉ hộ đã đăng ký'),
    ('TTT', 1, null,          time '18:00', time '20:00', 'HOUSEHOLD',            null),
    ('TTT', 3, null,          time '18:00', time '20:00', 'HOUSEHOLD',            null),
    ('TTT', 5, null,          time '18:00', time '20:00', 'HOUSEHOLD_RECYCLABLE', null),
    ('TTT', 7, 1,             time '08:00', time '11:00', 'BULKY',                'Chỉ hộ đã đăng ký'),
    ('NB',  1, null,          time '06:00', time '08:00', 'HOUSEHOLD',            null),
    ('NB',  3, null,          time '06:00', time '08:00', 'HOUSEHOLD',            null),
    ('NB',  5, null,          time '06:00', time '08:00', 'HOUSEHOLD_RECYCLABLE', null),
    ('NB',  6, 1,             time '07:00', time '10:00', 'BULKY',                'Chỉ hộ đã đăng ký')
) as s (district_code, weekday, week_of_month, start_time, end_time, waste_type, note)
    on s.district_code = d.code;
