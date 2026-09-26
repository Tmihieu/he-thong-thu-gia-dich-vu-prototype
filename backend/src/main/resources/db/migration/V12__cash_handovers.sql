-- T25 · collection · CashHandover (docs/data-dictionary.md §2.4)
-- Quản lý công ty ghi khi nhận tiền mặt của người đi thu (G5). Không gắn kỳ thu (D5).

create table cash_handovers (
    id             bigint generated always as identity primary key,
    code           varchar(20)  not null,
    collector_id   bigint       not null references users (id),
    company_id     bigint       not null references companies (id),
    handover_date  date         not null,
    amount         bigint       not null,
    note           varchar(500),
    received_by    bigint       not null references users (id),

    created_at     timestamptz  not null default now(),
    created_by     bigint references users (id),
    updated_at     timestamptz  not null default now(),
    updated_by     bigint references users (id),
    version        integer      not null default 0,

    constraint uq_cash_handovers_code unique (code),
    constraint ck_cash_handovers_amount check (amount > 0)
);

create index ix_cash_handovers_collector on cash_handovers (collector_id);
create index ix_cash_handovers_company on cash_handovers (company_id, handover_date);
