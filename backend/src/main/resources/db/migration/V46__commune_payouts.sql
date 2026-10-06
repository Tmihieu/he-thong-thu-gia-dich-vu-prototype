-- S9 · remittance · CommunePayout (docs/data-dictionary.md §2.5)
-- Phiếu chi trả công ty: xã trả lại công ty khi "phải nộp xã" của công ty trong kỳ âm (UC-55).
-- 1 phiếu 1 kỳ, 1 kỳ trả nhiều lần. Phiếu không sửa, không hủy.

create table commune_payouts (
    id           bigint generated always as identity primary key,
    code         varchar(20)  not null,
    company_id   bigint       not null references companies (id),
    period_id    bigint       not null references collection_periods (id),
    amount       bigint       not null,
    payout_date  date         not null,
    note         varchar(500),

    created_at   timestamptz  not null default now(),
    created_by   bigint references users (id),
    updated_at   timestamptz  not null default now(),
    updated_by   bigint references users (id),
    version      integer      not null default 0,

    constraint uq_commune_payouts_code unique (code),
    constraint ck_commune_payouts_amount check (amount > 0)
);

create index ix_commune_payouts_period_company on commune_payouts (period_id, company_id);
