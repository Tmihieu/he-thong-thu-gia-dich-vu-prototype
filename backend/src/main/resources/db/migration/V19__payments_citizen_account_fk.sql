-- T40 · collection · khóa ngoại payments.citizen_account_id đã hẹn ở V10 (bỏ sót ở V18).
-- Thanh toán qua app người dân (APP_SIMULATED) phải gắn tài khoản người dân.

alter table payments
    add constraint fk_payments_citizen_account foreign key (citizen_account_id) references citizen_accounts (id);
comment on column payments.citizen_account_id is 'Có khi APP_SIMULATED';

alter table payments
    add constraint ck_payments_app_citizen check (method <> 'APP_SIMULATED' or citizen_account_id is not null);

create index ix_payments_citizen_account on payments (citizen_account_id) where citizen_account_id is not null;
