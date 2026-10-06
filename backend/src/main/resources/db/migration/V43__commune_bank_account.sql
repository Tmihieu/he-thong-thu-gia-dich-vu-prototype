-- Góp ý BA 05/10 (UC-54): một tài khoản nhận chuyển khoản chung của xã, thay cho companies.bank_account / bank_name.
-- Bảng một dòng: cột singleton luôn true và duy nhất nên không thể có dòng thứ hai.
create table commune_bank_account (
    id              bigint generated always as identity primary key,
    singleton       boolean      not null default true,
    bank_name       varchar(100) not null,
    account_number  varchar(50)  not null,
    account_holder  varchar(150) not null,

    created_at      timestamptz  not null default now(),
    created_by      bigint references users (id),
    updated_at      timestamptz  not null default now(),
    updated_by      bigint references users (id),
    version         integer      not null default 0,

    constraint uq_commune_bank_account_singleton unique (singleton),
    constraint ck_commune_bank_account_singleton check (singleton)
);

alter table companies drop column bank_account;
alter table companies drop column bank_name;
