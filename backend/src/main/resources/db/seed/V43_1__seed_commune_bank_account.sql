-- Góp ý BA 05/10 (UC-54): tài khoản nhận chuyển khoản tạm của xã cho demo. Giao dịch ngân hàng đã seed (V40_3, ghi theo
-- tài khoản từng công ty) chuyển về tài khoản xã, riêng dòng "sai tài khoản" vẫn là một tài khoản lạ.
insert into commune_bank_account (bank_name, account_number, account_holder)
values ('Vietcombank', '9999000000', 'UBND XA DONG THANH');

update bank_transfers set gateway = 'Vietcombank', account_number = '9999000000' where reason is distinct from 'WRONG_ACCOUNT';
update bank_transfers set account_number = '9999000006' where reason = 'WRONG_ACCOUNT';
