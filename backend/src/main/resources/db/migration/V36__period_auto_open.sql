-- Quyết định 04/10/2026: hệ thống tự tạo kỳ thu kế tiếp ở trạng thái Dự thảo; cán bộ xã xem trước các khoản rồi bấm
-- "Mở kỳ & phát hành". Quản trị chỉ cấu hình quy tắc (ngày tạo, chu kỳ, số ngày hạn).

alter table collection_periods drop constraint ck_collection_periods_status;
alter table collection_periods add constraint ck_collection_periods_status
    check (status in ('DRAFT', 'COLLECTING', 'LOCKED'));

-- Một dòng duy nhất (id = 1). Mặc định tắt: bật rồi hệ thống mới tự tạo kỳ.
create table period_auto_rule (
    id                  integer     primary key,
    enabled             boolean     not null default false,
    period_type         varchar(30) not null default 'MONTH',
    create_day          integer     not null default 25,
    household_due_days  integer     not null default 15,
    remit_due_days      integer     not null default 10,
    updated_at          timestamptz not null default now(),
    updated_by          bigint references users (id),

    constraint ck_period_auto_rule_single check (id = 1),
    constraint ck_period_auto_rule_type check (period_type in ('MONTH', 'QUARTER')),
    constraint ck_period_auto_rule_create_day check (create_day between 1 and 28),
    constraint ck_period_auto_rule_household_days check (household_due_days >= 1),
    constraint ck_period_auto_rule_remit_days check (remit_due_days >= 0)
);

insert into period_auto_rule (id) values (1);

comment on table period_auto_rule is 'Quy tắc tự tạo kỳ thu dự thảo; chỉ quản trị sửa';
comment on column period_auto_rule.create_day is 'Từ ngày này trong tháng, tạo kỳ kế tiếp (quý: chỉ trong tháng cuối quý)';
comment on column period_auto_rule.household_due_days is 'Hạn hộ đóng mặc định = ngày phát hành + số ngày này (không quá hạn công ty nộp xã)';
comment on column period_auto_rule.remit_due_days is 'Hạn công ty nộp xã = ngày cuối kỳ + số ngày này';
