-- Vai trò Lãnh đạo và đề nghị miễn giảm / hoàn / xóa nợ (SPEC §9.10, T54–T58, quyết định 29/09/2026).

-- Lãnh đạo: vai trò nội bộ không thuộc công ty.
alter table users drop constraint ck_users_role;
alter table users add constraint ck_users_role
    check (role in ('COMMUNE_OFFICER', 'COMPANY_MANAGER', 'COLLECTOR', 'ADMIN', 'LEADER'));
comment on table users is 'Tài khoản đăng nhập web của 5 vai trò nội bộ';

-- Xóa nợ: khoản Chưa thu → Đã xóa nợ. written_off_period_id = kỳ ghi nhận: chính kỳ của khoản nếu kỳ chưa khóa
-- (trừ thẳng phải thu kỳ đó), ngược lại là kỳ đang thu lúc duyệt (O10: kỳ khóa giữ nguyên số).
-- amount được sửa khi lãnh đạo từ chối miễn giảm (khoản Miễn giảm về Chưa thu, O8).
alter table charges drop constraint ck_charges_status;
alter table charges add constraint ck_charges_status check (status in ('UNPAID', 'PAID', 'EXEMPT', 'WRITTEN_OFF'));
alter table charges add column written_off_period_id bigint references collection_periods (id);
alter table charges add constraint ck_charges_written_off
    check ((status = 'WRITTEN_OFF') = (written_off_period_id is not null));
comment on column charges.written_off_period_id is 'Kỳ ghi nhận xóa nợ (T57); null nếu chưa xóa nợ';

-- Hoàn tiền: một dòng thanh toán âm, method REFUND, không gắn người đi thu (tiền mặt đang giữ không đổi).
-- ledger_period_id = kỳ ghi nhận của dòng này trong sổ công ty–kỳ; null = kỳ của khoản (mọi thanh toán thường).
alter table payments drop constraint ck_payments_amount;
alter table payments drop constraint ck_payments_method;
alter table payments drop constraint ck_payments_collector;
alter table payments add constraint ck_payments_method check (method in ('CASH', 'TRANSFER', 'APP_SIMULATED', 'REFUND'));
alter table payments add constraint ck_payments_amount check ((method = 'REFUND') = (amount < 0) and amount <> 0);
alter table payments add constraint ck_payments_collector
    check (method in ('APP_SIMULATED', 'REFUND') or collector_id is not null);
alter table payments add column ledger_period_id bigint references collection_periods (id);
comment on column payments.ledger_period_id is 'Kỳ ghi nhận trong sổ công ty–kỳ (hoàn tiền, T58); null = kỳ của khoản';

create table approval_requests (
    id                   bigint generated always as identity primary key,
    code                 varchar(20)   not null,
    type                 varchar(20)   not null,
    contract_id          bigint references service_contracts (id),
    charge_id            bigint references charges (id),
    amount               bigint,
    reason               varchar(1000) not null,
    decision_no          varchar(50),
    status               varchar(20)   not null,
    requested_by         bigint        not null references users (id),
    requested_at         timestamptz   not null,
    decided_by           bigint references users (id),
    decided_at           timestamptz,
    decision_note        varchar(1000),
    effective_period_id  bigint references collection_periods (id),

    created_at           timestamptz   not null default now(),
    created_by           bigint references users (id),
    updated_at           timestamptz   not null default now(),
    updated_by           bigint references users (id),
    version              integer       not null default 0,

    constraint uq_approval_requests_code unique (code),
    constraint ck_approval_requests_type check (type in ('EXEMPTION', 'REFUND', 'WRITE_OFF')),
    constraint ck_approval_requests_status check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    constraint ck_approval_requests_target check (
        (type = 'EXEMPTION' and contract_id is not null and charge_id is null)
        or (type <> 'EXEMPTION' and charge_id is not null and contract_id is null)),
    constraint ck_approval_requests_amount check ((type = 'REFUND') = (amount is not null) and (amount is null or amount > 0)),
    constraint ck_approval_requests_decided check ((status = 'PENDING') = (decided_at is null)),
    constraint ck_approval_requests_reject_note check (status <> 'REJECTED' or decision_note is not null)
);
create index ix_approval_requests_status on approval_requests (status);
create index ix_approval_requests_charge on approval_requests (charge_id);
comment on table approval_requests is 'Đề nghị miễn giảm / hoàn / xóa nợ; xã lập, lãnh đạo duyệt (T55)';
