-- T10 · master-data · TariffVersion, TariffRate, FeeType (docs/data-dictionary.md §2.2)
-- Biểu giá chỉ gồm 2 thành phần thu gom + xử lý (G9, duyệt 24/09/2026; giữ nguyên theo quyết định 26/09/2026).

create table tariff_versions (
    id           bigint generated always as identity primary key,
    code         varchar(20)  not null,
    legal_basis  varchar(100) not null,
    issued_date  date,
    valid_from   date         not null,
    valid_to     date,
    status       varchar(30)  not null default 'DRAFT',
    scope_note   varchar(255),
    note         text,

    created_at   timestamptz  not null default now(),
    created_by   bigint references users (id),
    updated_at   timestamptz  not null default now(),
    updated_by   bigint references users (id),
    version      integer      not null default 0,

    constraint uq_tariff_versions_code unique (code),
    constraint ck_tariff_versions_status check (status in ('DRAFT', 'ACTIVE', 'EXPIRED')),
    constraint ck_tariff_versions_validity check (valid_to is null or valid_to >= valid_from),
    -- Các phiên bản ACTIVE không chồng lấn hiệu lực (valid_to null = chưa hết hạn).
    constraint ex_tariff_versions_active_overlap exclude using gist (
        daterange(valid_from, valid_to, '[]') with &&
    ) where (status = 'ACTIVE')
);

create table tariff_rates (
    id                 bigint generated always as identity primary key,
    tariff_version_id  bigint      not null references tariff_versions (id),
    tariff_group       varchar(30) not null,
    collection_fee     bigint      not null,
    processing_fee     bigint      not null,
    monthly_total      bigint      not null,
    unit_label         varchar(30) not null,

    created_at         timestamptz not null default now(),
    created_by         bigint references users (id),
    updated_at         timestamptz not null default now(),
    updated_by         bigint references users (id),
    version            integer     not null default 0,

    constraint uq_tariff_rates_group unique (tariff_version_id, tariff_group),
    constraint ck_tariff_rates_group check (tariff_group in ('HH_UP_TO_2', 'HH_3_PLUS', 'SMALL_GENERATOR', 'BY_VOLUME')),
    constraint ck_tariff_rates_non_negative check (collection_fee >= 0 and processing_fee >= 0),
    constraint ck_tariff_rates_total check (monthly_total = collection_fee + processing_fee)
);

create table fee_types (
    id             bigint generated always as identity primary key,
    code           varchar(20)  not null,
    name           varchar(100) not null,
    pricing_mode   varchar(30)  not null,
    default_price  bigint,
    active         boolean      not null default true,

    created_at     timestamptz  not null default now(),
    created_by     bigint references users (id),
    updated_at     timestamptz  not null default now(),
    updated_by     bigint references users (id),
    version        integer      not null default 0,

    constraint uq_fee_types_code unique (code),
    constraint ck_fee_types_pricing_mode check (pricing_mode in ('TARIFF', 'FIXED')),
    constraint ck_fee_types_fixed_price check (pricing_mode <> 'FIXED' or default_price is not null),
    constraint ck_fee_types_price_non_negative check (default_price is null or default_price >= 0)
);

comment on column tariff_rates.processing_fee is 'Số tạm cho tới khi có số chính thức QĐ 65/2026 (G9)';
comment on column fee_types.default_price is 'Bắt buộc khi FIXED; phiếu YCT được nhập giá khác (R1)';
