-- T05 · platform · User (docs/data-dictionary.md §2.1)
-- Tài khoản đăng nhập web của 4 vai trò nội bộ. Người dân không có dòng ở đây (G8).
-- FK users.company_id → companies thêm ở V3 khi có bảng companies.

create table users (
    id              bigint generated always as identity primary key,
    username        varchar(50)  not null,
    full_name       varchar(100) not null,
    phone           varchar(15),
    email           varchar(100),
    organization    varchar(100),
    role            varchar(30)  not null,
    company_id      bigint,
    password_hash   varchar(100) not null,
    status          varchar(30)  not null default 'ACTIVE',
    last_login_at   timestamptz,

    created_at      timestamptz  not null default now(),
    created_by      bigint references users (id),
    updated_at      timestamptz  not null default now(),
    updated_by      bigint references users (id),
    version         integer      not null default 0,

    constraint uq_users_username unique (username),
    constraint ck_users_username_format check (username ~ '^[a-z0-9._]{3,50}$'),
    constraint ck_users_phone_digits check (phone is null or phone ~ '^[0-9]{9,15}$'),
    constraint ck_users_role check (role in ('COMMUNE_OFFICER', 'COMPANY_MANAGER', 'COLLECTOR', 'ADMIN')),
    constraint ck_users_status check (status in ('ACTIVE', 'LOCKED')),
    constraint ck_users_company_by_role check (
        (role in ('COMPANY_MANAGER', 'COLLECTOR')) = (company_id is not null)
    )
);

comment on table users is 'Tài khoản đăng nhập web của 4 vai trò nội bộ';
comment on column users.company_id is 'Bắt buộc khi COMPANY_MANAGER, COLLECTOR; null với vai trò khác';
comment on column users.password_hash is 'bcrypt; không bao giờ trả ra API';
