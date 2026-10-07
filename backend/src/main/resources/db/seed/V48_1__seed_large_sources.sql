-- Seed demo (chỉ profile demo): nguồn thải lớn có phí xử lý ở kỳ 09/2026, để màn Đối soát có số ở cột Xử lý.
-- Mọi tên, số kg, số tiền, thời điểm là GIẢ, dựng bằng quy tắc xác định (chạy lại ra cùng kết quả).
--
-- Mỗi công ty 2 nguồn thải lớn (mã NL…, nhóm FULL_COST_BY_KG = thu gom 453 + vận chuyển 180 + xử lý 421 = 1.054 đ/kg) ở 2
-- ấp khác nhau của công ty: một hộ trả qua QR (chuyển khoản vào tài khoản xã), một hộ trả tiền mặt cho người đi thu, người
-- đi thu bàn giao ngay. Số kg theo tỷ lệ tiền mặt : QR = 453 : 601 (m × 453 kg và m × 601 kg, m khác nhau theo công ty)
-- nên phần vận chuyển + xử lý trong tiền mặt đúng bằng phần thu gom trong QR: phải nộp xã, còn phải nộp, phiếu thu của mọi
-- công ty kỳ 09 KHÔNG đổi so với V22_1 / V40_3 (DV01 vẫn được xã trả lại 175.788 đ). Chỉ phải thu, đã thu, phí thu gom
-- công ty hưởng và phí xử lý tăng.

create temp table seed_large on commit drop as
with co as (
    select c.id as company_id, c.code as company_code, row_number() over (order by c.code) as idx
    from companies c
    where exists (select 1 from charges ch join collection_periods p on p.id = ch.period_id
                  where p.code = '2026-09' and ch.company_id = c.id)
),
areas_of as (
    -- Ấp của công ty tại ngày phát hành 01/09 mà phiếu kỳ 09 có phát hành (có hộ đang cung cấp dịch vụ).
    select co.*, aa.area_id, a.code as area_code, d.code as dcode,
           row_number() over (partition by co.company_id order by a.code) as rn,
           count(*) over (partition by co.company_id) as n
    from co
    join area_assignments aa on aa.company_id = co.company_id
        and date '2026-09-01' between aa.valid_from and coalesce(aa.valid_to, date '2026-09-01')
    join areas a on a.id = aa.area_id
    join districts d on d.id = a.district_id
    where exists (select 1 from charges ch join collection_periods p on p.id = ch.period_id
                  where p.code = '2026-09' and ch.area_id = aa.area_id and ch.company_id = co.company_id)
)
-- Ấp đầu và ấp giữa danh sách của công ty (rải ra 2 nơi); công ty chỉ có 1 ấp thì cả hai cùng ấp.
select x.company_id, x.company_code, x.idx, x.area_id, x.area_code, x.dcode, v.method,
       20 + (x.idx * 7) % 11 as m,
       case v.method when 'CASH' then 453 else 601 end * (20 + (x.idx * 7) % 11) as kg,
       (x.idx - 1) * 2 + v.k as no
from areas_of x
cross join (values (1, 'TRANSFER'), (2, 'CASH')) as v (k, method)
where x.rn = case v.k when 1 then 1 else x.n / 2 + 1 end;

create temp table seed_large_subject on commit drop as
select l.*,
       l.dcode || '-NL' || lpad((b.last_no + row_number() over (partition by l.dcode order by l.no))::text, 5, '0') as code,
       (array['Công ty TNHH Bao bì Mẫu', 'Nhà máy Chế biến Thực phẩm Mẫu', 'Siêu thị Mẫu', 'Xưởng may Mẫu',
              'Nhà hàng Tiệc cưới Mẫu', 'Bệnh viện Đa khoa Mẫu', 'Khu nhà trọ Mẫu', 'Công ty CP Cơ khí Mẫu',
              'Kho lạnh Mẫu', 'Trường Tiểu học Mẫu', 'Chợ đầu mối Mẫu'])[(l.no - 1) % 11 + 1] || ' ' || l.no as name
from seed_large l
join (
    select d.dcode, coalesce(max(substring(s.code from '[0-9]+$')::int), 0) as last_no
    from (select distinct dcode from seed_large) d
    left join service_subjects s on s.code like d.dcode || '-NL%'
    group by d.dcode
) b on b.dcode = l.dcode;

insert into service_subjects (code, subject_type, name, address, house_no, street, area_id, phone, representative_name)
select s.code, 'LARGE_SOURCE', s.name, 'Số ' || (500 + s.no) || ' đường Công nghiệp Mẫu ' || s.idx,
       'Số ' || (500 + s.no), 'đường Công nghiệp Mẫu ' || s.idx, s.area_id, '0977' || lpad(s.no::text, 6, '0'),
       'Giám Đốc Mẫu NL ' || s.no
from seed_large_subject s;

-- Đăng ký thu phí: cân một lần làm định mức kg/tháng (câu 7, 06/10).
insert into service_contracts (contract_no, subject_id, tariff_group, valid_from, quota_kg)
select 'ĐK-' || s.dcode || '-' || lpad((b.last_no + row_number() over (partition by s.dcode order by s.code))::text, 4, '0'),
       sub.id, 'FULL_COST_BY_KG', date '2026-01-01', s.kg
from seed_large_subject s
join service_subjects sub on sub.code = s.code
join (
    select d.dcode, coalesce(max(substring(k.contract_no from '[0-9]+$')::int), 0) as last_no
    from (select distinct dcode from seed_large_subject) d
    left join service_contracts k on k.contract_no like 'ĐK-' || d.dcode || '-%'
    group by d.dcode
) b on b.dcode = s.dcode;

-- Khoản kỳ 09 theo phiếu của công ty: DV01 phiếu YCT-0926-01 (phạm vi công ty), công ty khác YCT-0926-02 (theo tổ).
-- Tiền = đơn giá đ/kg × định mức × 1 tháng, như ChargeCalculator.
insert into charges (code, charge_request_id, subject_id, contract_id, period_id, fee_type_id, area_id, company_id,
                     tariff_group, unit_price, months, amount, quota_kg, coverage_from, coverage_to, status)
select 'KT-0926-' || s.code, r.id, sub.id, k.id, p.id, r.fee_type_id, s.area_id, s.company_id, k.tariff_group,
       t.monthly_total, 1, t.monthly_total * s.kg, s.kg, p.start_date, p.end_date, 'UNPAID'
from seed_large_subject s
join service_subjects sub on sub.code = s.code
join service_contracts k on k.subject_id = sub.id
join charge_requests r on r.code = case when s.company_code = 'DV01' then 'YCT-0926-01' else 'YCT-0926-02' end
join collection_periods p on p.id = r.period_id
join tariff_rates t on t.tariff_version_id = p.tariff_version_id and t.tariff_group = k.tariff_group;

-- Thu đủ một lần. Mã thu tiếp nối mã kỳ 09 lớn nhất, theo thứ tự thời gian.
create temp table seed_large_pay on commit drop as
select 'TT-0926-' || lpad((b.last_no + row_number() over (order by x.paid_at, x.code))::text, 6, '0') as pay_code,
       row_number() over (order by x.paid_at, x.code) as n, x.*
from (
    select s.*, ch.id as charge_id, ch.code as charge_code, ch.amount,
           timestamptz '2026-09-08 09:00+07' + (s.no % 12) * interval '1 day' + (s.no * 17 % 300) * interval '1 minute'
             as paid_at,
           (select u.id from users u where u.role = 'COLLECTOR' and u.company_id = s.company_id order by u.username limit 1)
             as collector_id
    from seed_large_subject s
    join charges ch on ch.code = 'KT-0926-' || s.code
) x,
(select coalesce(max(substring(code from '[0-9]+$')::int), 0) as last_no from payments where code like 'TT-0926-%') b;

insert into payments (code, charge_id, amount, method, paid_at, collector_id, confirmed_by, bank_ref, note,
                      client_request_id)
select p.pay_code, p.charge_id, p.amount, p.method, p.paid_at,
       case when p.method = 'CASH' then p.collector_id end,
       case when p.method = 'CASH' then p.collector_id end,
       case when p.method = 'TRANSFER' then 'FT26NL' || lpad(p.n::text, 8, '0') end,
       case when p.method = 'TRANSFER' then 'Chuyển khoản qua SePay' end,
       'seed-' || p.pay_code
from seed_large_pay p;

update charges c set status = 'PAID', paid_at = p.paid_at
from seed_large_pay p
where c.id = p.charge_id;

-- QR đã khớp: ngân hàng báo về đúng mã khoản + đúng số tiền vào tài khoản xã (V43_1).
insert into bank_transfers (sepay_id, gateway, account_number, transaction_date, amount, content, code, reference_code,
                            status, charge_id, payment_id, company_id)
select 90002000 + p.n, a.bank_name, a.account_number,
       to_char(p.paid_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS'), p.amount,
       'VSMT' || lpad(p.charge_id::text, 6, '0') || ' Thanh toan phi ve sinh thang 09 2026',
       'VSMT' || lpad(p.charge_id::text, 6, '0'), pay.bank_ref, 'MATCHED', p.charge_id, pay.id, p.company_id
from seed_large_pay p
join payments pay on pay.code = p.pay_code
cross join (select bank_name, account_number from commune_bank_account limit 1) a
where p.method = 'TRANSFER';

-- Người đi thu bàn giao ngay hôm sau toàn bộ tiền mặt của nguồn thải lớn (số đang giữ của người thu không đổi).
create temp table seed_large_handover on commit drop as
select 'BG-0926-' || lpad((b.last_no + row_number() over (order by p.paid_at, p.pay_code))::text, 2, '0') as code,
       p.collector_id, p.company_id, (p.paid_at at time zone 'Asia/Ho_Chi_Minh')::date + 1 as handover_date, p.amount,
       m.id as manager_id, m.username as manager_username, cu.username as collector_username
from seed_large_pay p
join users m on m.company_id = p.company_id and m.role = 'COMPANY_MANAGER'
join users cu on cu.id = p.collector_id,
(select coalesce(max(substring(code from '[0-9]+$')::int), 0) as last_no from cash_handovers where code like 'BG-0926-%') b
where p.method = 'CASH';

insert into cash_handovers (code, collector_id, company_id, handover_date, amount, note, received_by, created_by)
select h.code, h.collector_id, h.company_id, h.handover_date, h.amount, 'Bàn giao tiền nguồn thải lớn', h.manager_id,
       h.manager_id
from seed_large_handover h;

-- Nhật ký, cùng action / khóa JSON như CollectionService, CashHandoverService ghi (như V40_3).
insert into audit_logs (occurred_at, actor_user_id, actor_username, actor_role, action, entity_type, entity_id,
                        before_data, after_data)
select a.occurred_at, u.id, a.username, coalesce(u.role, a.role), a.action, a.entity_type, a.entity_id, a.before_data,
       a.after_data
from (
    select p.paid_at as occurred_at,
           case p.method when 'CASH' then cu.username else 'system' end as username,
           case p.method when 'CASH' then 'COLLECTOR' else 'SYSTEM' end as role,
           case p.method when 'CASH' then 'RECORD_PAYMENT' else 'RECORD_BANK_TRANSFER' end as action,
           'Charge' as entity_type, p.charge_code as entity_id,
           jsonb_build_object('status', 'UNPAID', 'chargeAmount', p.amount, 'paidAmount', 0) as before_data,
           jsonb_build_object('status', 'PAID', 'chargeAmount', p.amount, 'paidAmount', p.amount, 'payment', p.pay_code,
                              'paymentAmount', p.amount, 'method', p.method) as after_data
    from seed_large_pay p
    left join users cu on cu.id = p.collector_id
    union all
    select h.handover_date + time '17:00' at time zone 'Asia/Ho_Chi_Minh', h.manager_username, 'COMPANY_MANAGER',
           'RECEIVE_CASH_HANDOVER', 'CashHandover', h.code, null,
           jsonb_build_object('collector', h.collector_username, 'amount', h.amount, 'date', h.handover_date,
                              'heldBefore', held.cash, 'heldAfter', held.cash - h.amount)
    from seed_large_handover h
    cross join lateral (
        select coalesce((select sum(p.amount) from payments p where p.collector_id = h.collector_id and p.method = 'CASH'), 0)
             - coalesce((select sum(x.amount) from cash_handovers x where x.collector_id = h.collector_id and x.code <> h.code), 0)
               as cash
    ) held
) a
left join users u on u.username = a.username
order by a.occurred_at;
