-- T26 · remittance · CompanyReceipt (docs/data-dictionary.md §2.5)
-- Xã lập mỗi lần công ty nộp tiền: 1 phiếu 1 kỳ, 1 kỳ nhiều phiếu (R15). Phiếu không sửa, không hủy (G6).

create table company_receipts (
    id            bigint generated always as identity primary key,
    code          varchar(20)  not null,
    company_id    bigint       not null references companies (id),
    period_id     bigint       not null references collection_periods (id),
    amount        bigint       not null,
    method        varchar(30)  not null,
    receipt_date  date         not null,
    payer_name    varchar(100) not null,
    document_ref  varchar(50),
    note          varchar(500),
    status        varchar(30)  not null default 'RECORDED',

    created_at    timestamptz  not null default now(),
    created_by    bigint references users (id),
    updated_at    timestamptz  not null default now(),
    updated_by    bigint references users (id),
    version       integer      not null default 0,

    constraint uq_company_receipts_code unique (code),
    constraint ck_company_receipts_amount check (amount > 0),
    constraint ck_company_receipts_method check (method in ('CASH', 'TRANSFER')),
    constraint ck_company_receipts_status check (status in ('RECORDED'))
);

create index ix_company_receipts_period_company on company_receipts (period_id, company_id);
