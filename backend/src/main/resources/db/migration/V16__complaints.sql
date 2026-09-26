-- T36 · complaint · Complaint, ComplaintEvent (docs/data-dictionary.md §3.2)
-- Công ty chỉ thấy khiếu nại đã chuyển cho mình (G12). Timeline nối tiếp, không ghi đè.
-- citizen_account_id / actor_citizen_id: khóa ngoại tới citizen_accounts thêm ở V18.

create table complaints (
    id                    bigint generated always as identity primary key,
    code                  varchar(20)   not null,
    received_date         date          not null,
    complainant_name      varchar(100)  not null,
    complainant_phone     varchar(15),
    citizen_account_id    bigint,
    subject_id            bigint references service_subjects (id),
    area_id               bigint        not null references areas (id),
    channel               varchar(20)   not null,
    category              varchar(30)   not null,
    summary               varchar(200)  not null,
    content               varchar(4000) not null,
    status                varchar(20)   not null default 'NEW',
    forwarded_company_id  bigint references companies (id),
    deadline              date,
    resolution            varchar(2000),
    resolved_at           timestamptz,
    photo_urls            text,
    location              varchar(100),

    created_at            timestamptz   not null default now(),
    created_by            bigint references users (id),
    updated_at            timestamptz   not null default now(),
    updated_by            bigint references users (id),
    version               integer       not null default 0,

    constraint uq_complaints_code unique (code),
    constraint ck_complaints_channel check (channel in ('APP', 'PHONE', 'IN_PERSON')),
    constraint ck_complaints_category check (category in
        ('LATE_COLLECTION', 'OVERCHARGE', 'POLLUTION_POINT', 'STAFF_ATTITUDE', 'OTHER')),
    constraint ck_complaints_status check (status in ('NEW', 'PROCESSING', 'RESOLVED')),
    constraint ck_complaints_app_citizen check (channel <> 'APP' or citizen_account_id is not null),
    constraint ck_complaints_forward check ((forwarded_company_id is null) = (deadline is null)),
    constraint ck_complaints_resolved check (
        (status = 'RESOLVED') = (resolved_at is not null and coalesce(trim(resolution), '') <> ''))
);

create index ix_complaints_status on complaints (status);
create index ix_complaints_forwarded_company on complaints (forwarded_company_id);
create index ix_complaints_citizen on complaints (citizen_account_id);

create table complaint_events (
    id                  bigint generated always as identity primary key,
    complaint_id        bigint        not null references complaints (id),
    event_type          varchar(30)   not null,
    occurred_at         timestamptz   not null,
    actor_user_id       bigint references users (id),
    actor_citizen_id    bigint,
    actor_label         varchar(100)  not null,
    company_id          bigint references companies (id),
    content             varchar(2000) not null,
    visible_to_citizen  boolean       not null default true,
    created_at          timestamptz   not null default now(),

    constraint ck_complaint_events_type check (event_type in
        ('SUBMITTED', 'RECEIVED', 'FORWARDED', 'COMPANY_REPLIED', 'CLOSED')),
    constraint ck_complaint_events_company check (
        event_type not in ('FORWARDED', 'COMPANY_REPLIED') or company_id is not null)
);

create index ix_complaint_events_complaint on complaint_events (complaint_id, occurred_at, id);

create function complaint_events_append_only() returns trigger
language plpgsql as $$
begin
    raise exception 'complaint_events chỉ được thêm, không được sửa hoặc xóa';
end;
$$;

create trigger trg_complaint_events_append_only
    before update or delete on complaint_events
    for each row execute function complaint_events_append_only();
