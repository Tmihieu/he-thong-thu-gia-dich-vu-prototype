-- S9b · remittance · phiếu chi trả: hình thức trả + số chứng từ; báo sai sót phiếu chi dùng lại bảng receipt_issues (UC-56, UC-57).

alter table commune_payouts add column method varchar(30) not null default 'TRANSFER';
alter table commune_payouts alter column method drop default;
alter table commune_payouts add column document_ref varchar(50);
alter table commune_payouts add constraint ck_commune_payouts_method check (method in ('CASH', 'TRANSFER'));

-- Một sai sót thuộc đúng một phiếu: phiếu thu (receipt_id) hoặc phiếu chi trả (payout_id).
alter table receipt_issues alter column receipt_id drop not null;
alter table receipt_issues add column payout_id bigint references commune_payouts (id);
alter table receipt_issues add constraint ck_receipt_issues_target check (num_nonnulls(receipt_id, payout_id) = 1);
create index ix_receipt_issues_payout on receipt_issues (payout_id);
