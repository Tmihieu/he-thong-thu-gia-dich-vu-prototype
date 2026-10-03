-- Góp ý BA 03/10: nhắc hộ dân nộp phí tự động. Mỗi (khoản, mốc) chỉ nhắc một lần, kể cả khi job chạy lại.
create table household_reminders (
    charge_id  bigint      not null references charges (id),
    stage      varchar(20) not null,
    sent_at    timestamptz not null default now(),
    primary key (charge_id, stage),
    constraint ck_household_reminders_stage check (stage in ('OPEN', 'DUE_SOON', 'OVERDUE'))
);
comment on table household_reminders is 'Nhật ký nhắc nộp phí hộ dân: OPEN khi mới phát hành, DUE_SOON trước hạn 3 ngày, OVERDUE sau hạn 1 ngày';
