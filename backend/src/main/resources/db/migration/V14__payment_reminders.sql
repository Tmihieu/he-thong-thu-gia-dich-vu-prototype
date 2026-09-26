-- T34 · remittance · PaymentReminder (docs/data-dictionary.md §2.5)
-- Chỉ lập cho công ty có nợ quá hạn (R16). Giữ lịch sử, không xóa khi công ty hết nợ (D6).

create table payment_reminders (
    id             bigint generated always as identity primary key,
    code           varchar(20)   not null,
    company_id     bigint        not null references companies (id),
    reminder_date  date          not null,
    due_date       date          not null,
    amount         bigint        not null,
    content        varchar(2000) not null,

    created_at     timestamptz   not null default now(),
    created_by     bigint references users (id),
    updated_at     timestamptz   not null default now(),
    updated_by     bigint references users (id),
    version        integer       not null default 0,

    constraint uq_payment_reminders_code unique (code),
    constraint ck_payment_reminders_amount check (amount > 0),
    constraint ck_payment_reminders_due check (due_date >= reminder_date)
);

create table payment_reminder_periods (
    reminder_id  bigint not null references payment_reminders (id),
    period_id    bigint not null references collection_periods (id),
    primary key (reminder_id, period_id)
);

create index ix_payment_reminders_company on payment_reminders (company_id, reminder_date);
