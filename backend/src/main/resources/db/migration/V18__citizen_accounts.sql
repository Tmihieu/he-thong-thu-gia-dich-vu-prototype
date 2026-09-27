-- T39 · citizen-app · CitizenAccount (docs/data-dictionary.md §3.4)
-- Người dân không nằm trong users mà có bảng riêng (G8). Một SĐT ↔ một hộ; một hộ nhiều tài khoản (D11).
-- Đăng nhập bằng SĐT + OTP cố định mô phỏng (O7), không lưu OTP.

create table citizen_accounts (
    id             bigint generated always as identity primary key,
    phone          varchar(15)  not null,
    subject_id     bigint       not null references service_subjects (id),
    display_name   varchar(100) not null,
    status         varchar(30)  not null default 'ACTIVE',
    last_login_at  timestamptz,

    created_at     timestamptz  not null default now(),
    created_by     bigint references users (id),
    updated_at     timestamptz  not null default now(),
    updated_by     bigint references users (id),
    version        integer      not null default 0,

    constraint uq_citizen_accounts_phone unique (phone),
    constraint ck_citizen_accounts_phone_digits check (phone ~ '^0[0-9]{9,14}$'),
    constraint ck_citizen_accounts_status check (status in ('ACTIVE', 'LOCKED'))
);

create index ix_citizen_accounts_subject on citizen_accounts (subject_id);

-- Khóa ngoại đã hẹn ở V11 (thông báo) và V16 (khiếu nại).
alter table notifications
    add constraint fk_notifications_recipient_citizen foreign key (recipient_citizen_id) references citizen_accounts (id);
comment on column notifications.recipient_citizen_id is null;

alter table complaints
    add constraint fk_complaints_citizen_account foreign key (citizen_account_id) references citizen_accounts (id);

alter table complaint_events
    add constraint fk_complaint_events_actor_citizen foreign key (actor_citizen_id) references citizen_accounts (id);
