-- T23 · notifications · Notification (docs/data-dictionary.md §3.1)
-- Đã đọc tính chung trên bản ghi (D7): một người trong nhóm nhận đọc thì cả nhóm thấy đã đọc.
-- Không có updated_by, version: bản ghi chỉ đổi read_at.

create table notifications (
    id                    bigint generated always as identity primary key,
    recipient_type        varchar(30)   not null,
    recipient_role        varchar(30),
    recipient_company_id  bigint references companies (id),
    recipient_user_id     bigint references users (id),
    recipient_citizen_id  bigint,
    kind                  varchar(30)   not null,
    title                 varchar(200)  not null,
    body                  varchar(2000) not null,
    link                  jsonb,
    read_at               timestamptz,
    created_at            timestamptz   not null default now(),
    created_by            bigint references users (id),

    constraint ck_notifications_recipient_type check (recipient_type in ('ROLE', 'COMPANY', 'USER', 'CITIZEN')),
    constraint ck_notifications_kind check (kind in ('REMINDER', 'COMPLAINT', 'RECEIPT', 'INFO', 'TRANSACTION')),
    constraint ck_notifications_recipient check (
        (recipient_type = 'ROLE' and recipient_role is not null and recipient_company_id is null
            and recipient_user_id is null and recipient_citizen_id is null)
        or (recipient_type = 'COMPANY' and recipient_company_id is not null and recipient_user_id is null
            and recipient_citizen_id is null)
        or (recipient_type = 'USER' and recipient_user_id is not null and recipient_role is null
            and recipient_company_id is null and recipient_citizen_id is null)
        or (recipient_type = 'CITIZEN' and recipient_citizen_id is not null and recipient_role is null
            and recipient_company_id is null and recipient_user_id is null)
    )
);

create index ix_notifications_role on notifications (recipient_role) where recipient_type = 'ROLE';
create index ix_notifications_company on notifications (recipient_company_id) where recipient_type = 'COMPANY';
create index ix_notifications_user on notifications (recipient_user_id) where recipient_type = 'USER';
create index ix_notifications_citizen on notifications (recipient_citizen_id) where recipient_type = 'CITIZEN';

comment on column notifications.recipient_citizen_id is 'FK tới citizen_accounts thêm ở V18';
comment on column notifications.link is 'Đích điều hướng {"screen": ..., "params": {...}}, không chứa URL tuyệt đối';
