-- Chuyển khoản ngân hàng do SePay báo về qua webhook (04/10): mỗi giao dịch tiền vào lưu một dòng, khóa trùng theo
-- mã giao dịch SePay. Khớp đúng mã khoản thu + đúng số tiền + đúng tài khoản công ty thì tự ghi thanh toán (MATCHED);
-- còn lại để công ty đối chiếu tay (UNMATCHED, kèm lý do).
create table bank_transfers (
    id               bigint generated always as identity primary key,
    sepay_id         bigint        not null,
    gateway          varchar(100),
    account_number   varchar(50),
    transaction_date varchar(30),
    amount           bigint        not null,
    content          varchar(1000),
    code             varchar(50),
    reference_code   varchar(100),
    status           varchar(20)   not null,
    reason           varchar(40),
    charge_id        bigint references charges (id),
    payment_id       bigint references payments (id),
    company_id       bigint references companies (id),
    created_at       timestamptz   not null default now(),
    constraint uq_bank_transfers_sepay unique (sepay_id),
    constraint ck_bank_transfers_status check (status in ('MATCHED', 'UNMATCHED')),
    constraint ck_bank_transfers_matched check ((status = 'MATCHED') = (payment_id is not null))
);
create index ix_bank_transfers_company on bank_transfers (company_id, status, created_at desc);

-- Thanh toán chuyển khoản do ngân hàng xác nhận không qua tay người đi thu: chỉ tiền mặt mới bắt buộc người đi thu.
alter table payments drop constraint ck_payments_collector;
alter table payments add constraint ck_payments_collector check (method <> 'CASH' or collector_id is not null);
