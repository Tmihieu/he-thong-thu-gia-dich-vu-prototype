-- Phiếu quyết toán (07/10, docs/quyet-toan-0710.md): mỗi công ty mỗi kỳ một phiếu, thay phiếu thu công ty và phiếu chi
-- trả công ty. Số chênh lệch = công ty phải nộp xã − xã phải trả công ty; dương công ty nộp xã, âm xã trả công ty, 0 không
-- chuyển tiền (vẫn lập phiếu). Phiếu không sửa, không hủy; bỏ báo sai sót phiếu.

create table settlements (
    id                   bigint generated always as identity primary key,
    code                 varchar(20)  not null,
    company_id           bigint       not null references companies (id),
    period_id            bigint       not null references collection_periods (id),
    company_owes         bigint       not null,
    commune_owes         bigint       not null,
    amount               bigint       not null,
    method               varchar(30),
    settle_date          date         not null,
    representative_name  varchar(100) not null,
    document_ref         varchar(50),
    note                 varchar(500),

    created_at           timestamptz  not null default now(),
    created_by           bigint references users (id),
    updated_at           timestamptz  not null default now(),
    updated_by           bigint references users (id),
    version              integer      not null default 0,

    constraint uq_settlements_code unique (code),
    constraint uq_settlements_period_company unique (period_id, company_id),
    constraint ck_settlements_amount check (amount = company_owes - commune_owes),
    constraint ck_settlements_commune_owes check (commune_owes >= 0),
    constraint ck_settlements_method check (method in ('CASH', 'TRANSFER')),
    constraint ck_settlements_method_required check ((amount = 0) = (method is null))
);

-- Kỳ đã khóa thì mọi công ty đã nộp đủ và xã đã trả đủ: gộp phiếu thu / phiếu chi cũ thành một phiếu quyết toán. Phiếu của
-- kỳ đang thu là các đợt nộp dở theo cách cũ, không còn ý nghĩa khi đổi sang quyết toán một lần nên bỏ (chỉ có dữ liệu demo).
insert into settlements (code, company_id, period_id, company_owes, commune_owes, amount, method, settle_date,
                         representative_name, document_ref, note, created_by)
select 'QT-' || substring(x.last_code from '-(\w+)-\d+$') || '-'
           || lpad(row_number() over (partition by x.period_id order by x.company_code)::text, 3, '0'),
       x.company_id, x.period_id, x.received, x.paid_back, x.received - x.paid_back,
       case when x.received <> x.paid_back then x.method end, x.settle_date, x.representative_name, null,
       'Gộp từ phiếu thu / phiếu chi trước khi đổi sang quyết toán', x.created_by
from (
    select v.company_id, v.period_id, co.code as company_code, sum(v.received) as received, sum(v.paid_back) as paid_back,
           max(v.code) as last_code, max(v.day) as settle_date,
           (array_agg(v.method order by v.day desc, v.code desc))[1] as method,
           coalesce(max(v.payer), co.contact_name, co.name) as representative_name,
           (array_agg(v.created_by order by v.day desc, v.code desc))[1] as created_by
    from (
        select company_id, period_id, code, amount as received, 0 as paid_back, method, receipt_date as day,
               payer_name as payer, created_by
        from company_receipts
        union all
        select company_id, period_id, code, 0, amount, method, payout_date, null, created_by from commune_payouts
    ) v
    join collection_periods p on p.id = v.period_id and p.status = 'LOCKED'
    join companies co on co.id = v.company_id
    group by v.company_id, v.period_id, co.code, co.contact_name, co.name
) x;

drop table receipt_issues;
drop table commune_payouts;
drop table company_receipts;

-- Hạn dân đóng mặc định ngày 25 tháng cuối kỳ, hạn quyết toán ngày 5 tháng sau kỳ: quy tắc tự tạo kỳ không còn số ngày.
alter table period_auto_rule drop column remit_due_days;

comment on column collection_periods.due_date is 'Hạn dân đóng (mặc định ngày 25 tháng cuối kỳ); hạn quyết toán = ngày 5 tháng sau kỳ, tính ra';
