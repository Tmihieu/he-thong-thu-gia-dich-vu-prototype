-- T35 · remittance · ReceiptIssue (docs/data-dictionary.md §2.5)
-- Công ty báo sai sót phiếu thu của mình; xã "xử lý" = đóng kèm ghi chú, không sửa/hủy phiếu (G6).

create table receipt_issues (
    id               bigint generated always as identity primary key,
    receipt_id       bigint        not null references company_receipts (id),
    issue_type       varchar(30)   not null,
    correct_amount   bigint,
    description      varchar(1000) not null,
    status           varchar(30)   not null default 'PENDING',
    reported_by      bigint        not null references users (id),
    resolved_by      bigint references users (id),
    resolved_at      timestamptz,
    resolution_note  varchar(1000),

    created_at       timestamptz   not null default now(),
    created_by       bigint references users (id),
    updated_at       timestamptz   not null default now(),
    updated_by       bigint references users (id),
    version          integer       not null default 0,

    constraint ck_receipt_issues_type check (issue_type in ('WRONG_AMOUNT', 'WRONG_PERIOD', 'WRONG_DOCUMENT', 'NOT_OURS')),
    constraint ck_receipt_issues_status check (status in ('PENDING', 'RESOLVED')),
    constraint ck_receipt_issues_amount check (correct_amount is null or correct_amount >= 0),
    constraint ck_receipt_issues_resolved check (
        (status = 'RESOLVED') = (resolved_at is not null and resolved_by is not null
            and coalesce(trim(resolution_note), '') <> '')
    )
);

create index ix_receipt_issues_receipt on receipt_issues (receipt_id);
create index ix_receipt_issues_status on receipt_issues (status);
