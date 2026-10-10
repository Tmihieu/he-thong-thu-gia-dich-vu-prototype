-- Cán bộ xã điều chỉnh số tiền hoặc hủy khoản phải thu lập sai phí (khoản chưa có lần thu nào, kỳ chưa khóa).

alter table charges drop constraint ck_charges_status;
alter table charges add constraint ck_charges_status
    check (status in ('UNPAID', 'PAID', 'EXEMPT', 'WRITTEN_OFF', 'CANCELLED'));

alter table charges add column cancel_reason text;
alter table charges add column cancelled_at timestamptz;
alter table charges add constraint ck_charges_cancelled
    check ((status = 'CANCELLED') = (cancelled_at is not null and coalesce(trim(cancel_reason), '') <> ''));

-- Khoản đã hủy không chặn lập lại khoản đúng cho cùng hộ, cùng loại phí, cùng tháng.
alter table charges drop constraint ex_charges_overlap;
alter table charges add constraint ex_charges_overlap exclude using gist (
    subject_id with =,
    fee_type_id with =,
    daterange(coverage_from, coverage_to, '[]') with &&
) where (status <> 'CANCELLED');

comment on column charges.amount is 'Chỉ đổi khi lãnh đạo từ chối miễn giảm (O8) hoặc cán bộ xã điều chỉnh khoản chưa thu (charge_adjustments); số thực thu nằm ở payments (G4)';
comment on column charges.cancel_reason is 'Lý do cán bộ xã hủy khoản; chỉ có khi status = CANCELLED';

create table charge_adjustments (
    id          bigint generated always as identity primary key,
    charge_id   bigint      not null references charges (id),
    type        varchar(20) not null,
    old_amount  bigint      not null,
    new_amount  bigint      not null,
    reason      text        not null,

    created_at  timestamptz not null default now(),
    created_by  bigint references users (id),
    updated_at  timestamptz not null default now(),
    updated_by  bigint references users (id),
    version     integer     not null default 0,

    constraint ck_charge_adjustments_type check (type in ('ADJUST', 'CANCEL')),
    constraint ck_charge_adjustments_money check (old_amount >= 0 and new_amount >= 0),
    constraint ck_charge_adjustments_reason check (trim(reason) <> '')
);

create index ix_charge_adjustments_charge on charge_adjustments (charge_id);
