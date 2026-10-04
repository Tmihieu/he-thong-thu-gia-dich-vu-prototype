-- Seed demo (chỉ profile demo): làm đầy dữ liệu để các màn hình có số liệu của NHIỀU công ty chứ không chỉ DV01.
-- Mọi tên, số tài khoản, số tiền, thời điểm là GIẢ, dựng bằng quy tắc xác định (chạy lại ra cùng kết quả).
--
-- 1. Tài khoản ngân hàng TẠM cho cả 11 công ty: để màn người đi thu và app người dân hiện được mã VietQR. Số tài khoản
--    bắt đầu 9999… không phải tài khoản thật, tiền chuyển vào không về đâu. Muốn nhận chuyển khoản thật qua SePay thì sửa
--    ở Cấu hình → Công ty & địa bàn. Có tài khoản thì app chỉ hiện mã QR chờ ngân hàng báo về (không còn nút thanh toán
--    mô phỏng); giả lập ngân hàng báo về bằng scripts/simulate-bank-transfer.sh.
-- 2. Hộ cho 28 ấp mới (V40_1): mỗi ấp 6 hộ gia đình, cách 4 ấp có thêm 1 hộ kinh doanh, 1 hộ miễn giảm cách 4 ấp.
-- 3. Kỳ 09/2026 cho 10 công ty còn lại (phiếu YCT-0926-02, phạm vi theo tổ, cùng ngày và hạn như YCT-0926-01 của DV01).
--    Ấp 47 chưa có công ty nên không có khoản (kịch bản §10 bước 2). Số liệu của DV01 ở V22_1 không đổi.
-- 4. Thu tiền: tiền mặt (người đi thu của ấp), chuyển khoản qua mã QR (SePay báo về, tự ghi đã thu) và thanh toán trên
--    app; chuyển khoản chờ đối chiếu đủ các lý do. Mỗi hộ chỉ Đã đóng hoặc Chưa đóng, không có thu một phần.
-- 5. Bàn giao tiền mặt và phiếu thu nộp về xã, mỗi công ty một mức khác nhau (xem bảng seed_profile bên dưới) để Tiến độ
--    thu, Đối soát và Tổng quan có đủ trạng thái: đã nộp đủ, nộp một phần, quá hạn, dưới 45%.
-- 6. Nhật ký cho mọi thao tác tiền ở trên, cùng action/entity/khóa JSON như service ghi.
-- Không tạo thông báo như lúc chạy thật. Hộ có app người dân còn nợ kỳ 09 (TTT-H000221, NB-H000341; hộ DV01 đã đóng ở V22_1) để thử
-- đóng online: app hiện mã QR, giả lập ngân hàng báo về bằng scripts/simulate-bank-transfer.sh.

-- 1. Tài khoản ngân hàng tạm ------------------------------------------------------------------------------------------

update companies c set bank_name = b.bank_name, bank_account = b.bank_account
from (values
    ('DV01', 'Vietcombank', '9999000001'),
    ('DV02', 'MBBank',      '9999000002'),
    ('DV03', 'ACB',         '9999000003'),
    ('DV04', 'Techcombank', '9999000004'),
    ('DV05', 'VPBank',      '9999000005'),
    ('DV06', 'BIDV',        '9999000006'),
    ('DV07', 'VietinBank',  '9999000007'),
    ('DV08', 'TPBank',      '9999000008'),
    ('DV09', 'Sacombank',   '9999000009'),
    ('DV10', 'OCB',         '9999000010'),
    ('DV11', 'MSB',         '9999000011')
) as b (code, bank_name, bank_account)
where c.code = b.code;

-- 2. Hộ cho 28 ấp mới ---------------------------------------------------------------------------------------------------

with new_areas as (
    select a.id as area_id, d.code as dcode, row_number() over (order by a.code) as i
    from areas a join districts d on d.id = a.district_id
    where not exists (select 1 from service_subjects s where s.area_id = a.id)
),
src as (
    select h.dcode || '-H' || lpad(h.n::text, 6, '0') as code,
           'HOUSEHOLD' as subject_type,
           (array['Nguyễn','Trần','Lê','Phạm','Hoàng','Võ','Đặng','Bùi','Đỗ','Huỳnh'])[h.n % 10 + 1] || ' '
             || (array['Văn','Thị','Minh','Thanh','Ngọc'])[h.n % 5 + 1] || ' '
             || (array['An','Bình','Châu','Dũng','Giang','Hà','Khoa','Lan','Mai','Nam','Oanh','Phúc','Quân','Sơn','Tâm','Uyên','Vy','Xuân'])[h.n % 18 + 1]
             as name,
           'Số ' || (h.j * 5 + h.i) || ' đường Mẫu ' || (h.i + 24) as address,
           'Số ' || (h.j * 5 + h.i) as house_no, 'đường Mẫu ' || (h.i + 24) as street,
           h.area_id,
           '0902' || lpad(h.n::text, 6, '0') as phone,
           case when h.j % 3 = 0 then 2 else 3 + (h.j % 4) end as member_count,
           null::text as representative_name,
           case when h.j % 3 = 0 then 'HH_UP_TO_2' else 'HH_3_PLUS' end as tariff_group,
           (h.i % 4 = 0 and h.j = 6) as exempt
    from (
        select na.area_id, na.dcode, na.i, j, 1000 + (na.i - 1) * 10 + j as n
        from new_areas na cross join generate_series(1, 6) as j
    ) h
    union all
    select na.dcode || '-KD' || lpad((1000 + na.i)::text, 5, '0'), 'BUSINESS_HOUSEHOLD',
           'Cửa hàng tạp hóa Mẫu ' || (na.i + 24), 'Số ' || (200 + na.i) || ' đường Mẫu ' || (na.i + 24),
           'Số ' || (200 + na.i), 'đường Mẫu ' || (na.i + 24), na.area_id,
           '0911' || lpad((1000 + na.i)::text, 6, '0'), null, 'Người Đại Diện Mẫu ' || (na.i + 24),
           'SMALL_UP_TO_126', false
    from new_areas na where na.i % 4 = 1
),
base as (
    select d.dcode, coalesce(max(substring(k.contract_no from '[0-9]+$')::int), 0) as last_no
    from (select distinct dcode from new_areas) d
    left join service_contracts k on k.contract_no like 'ĐK-' || d.dcode || '-%'
    group by d.dcode
),
inserted as (
    insert into service_subjects (code, subject_type, name, address, house_no, street, area_id, phone, member_count,
                                  representative_name)
    select code, subject_type, name, address, house_no, street, area_id, phone, member_count, representative_name
    from src
    returning id, code
)
insert into service_contracts (contract_no, subject_id, tariff_group, valid_from, exempt, exempt_reason)
select 'ĐK-' || split_part(s.code, '-', 1) || '-'
         || lpad((b.last_no + row_number() over (partition by split_part(s.code, '-', 1) order by s.code))::text, 4, '0'),
       ins.id, s.tariff_group, date '2026-01-01', s.exempt,
       case when s.exempt then 'Hộ nghèo (dữ liệu giả)' end
from src s
join inserted ins on ins.code = s.code
join base b on b.dcode = split_part(s.code, '-', 1);

-- 3. Kỳ 09/2026 cho các công ty khác DV01 -----------------------------------------------------------------------------

insert into charge_requests (code, period_id, fee_type_id, scope_type, issue_date, due_date, created_by)
select 'YCT-0926-02', p.id, f.id, 'AREAS', date '2026-09-01', date '2026-09-20', u.id
from collection_periods p, fee_types f, users u
where p.code = '2026-09' and f.code = 'ENV' and u.username = 'canbo_xa';

insert into charge_request_areas (charge_request_id, area_id)
select r.id, aa.area_id
from charge_requests r
join area_assignments aa on r.issue_date between aa.valid_from and coalesce(aa.valid_to, r.issue_date)
join companies c on c.id = aa.company_id and c.code <> 'DV01'
where r.code = 'YCT-0926-02'
  and exists (select 1 from service_subjects s where s.area_id = aa.area_id and s.status = 'ACTIVE');

-- Như ChargeEligibility và V22_1: đối tượng đang cung cấp dịch vụ, hợp đồng hiệu lực và tổ có công ty tại ngày phát hành.
insert into charges (code, charge_request_id, subject_id, contract_id, period_id, fee_type_id, area_id, company_id,
                     tariff_group, unit_price, months, amount, coverage_from, coverage_to, due_date, status)
select 'KT-0926-' || s.code, r.id, s.id, k.id, p.id, r.fee_type_id, s.area_id, aa.company_id, k.tariff_group,
       t.monthly_total, 1, case when k.exempt then 0 else t.monthly_total end, p.start_date, p.end_date, r.due_date,
       case when k.exempt then 'EXEMPT' else 'UNPAID' end
from charge_requests r
join charge_request_areas ra on ra.charge_request_id = r.id
join collection_periods p on p.id = r.period_id
join area_assignments aa on aa.area_id = ra.area_id
    and r.issue_date between aa.valid_from and coalesce(aa.valid_to, r.issue_date)
join service_subjects s on s.area_id = ra.area_id and s.status = 'ACTIVE'
join service_contracts k on k.subject_id = s.id
    and r.issue_date between k.valid_from and coalesce(k.valid_to, r.issue_date)
join tariff_rates t on t.tariff_version_id = p.tariff_version_id and t.tariff_group = k.tariff_group
where r.code = 'YCT-0926-02';

-- 4. Thu tiền -----------------------------------------------------------------------------------------------------------
-- Mỗi công ty một "kịch bản": collect_pct = % khoản hộ đã đóng đủ; remit_pct = % phải nộp xã đã nộp (phiếu thu công ty).
-- Kỳ 09 hết hạn nộp 25/09 nên công ty nào chưa nộp đủ thì hiện Quá hạn nộp.

create temp table seed_profile (company_code varchar(10), collect_pct int, remit_pct int) on commit drop;
insert into seed_profile values
    ('DV02', 100, 100),   -- thu đủ, nộp đủ
    ('DV03',  85, 100),   -- còn vài hộ chưa đóng nhưng đã nộp đủ phần phải nộp
    ('DV04',  90,  60),   -- thu tốt, nộp một phần
    ('DV05',  70,  40),   -- nộp dưới 45%
    ('DV06',  60,   0),   -- chưa nộp đồng nào
    ('DV07',  95, 100),   -- thu tốt, nộp đủ (có hộ dùng app)
    ('DV08',  50,  30),   -- thu và nộp đều thấp
    ('DV09',  80,  80),   -- còn một ít phải nộp
    ('DV10',  30,   0),   -- thu dưới 45%, chưa nộp
    ('DV11', 100, 100);   -- đơn vị công, thu và nộp đủ

-- Kế hoạch từng khoản: CASH (tiền mặt), TRANSFER (QR chuyển khoản), NONE (chưa đóng).
-- (k*37) mod 100 là hoán vị của 0..99 nên tỷ lệ gần đúng collect_pct.
create temp table seed_plan on commit drop as
with base as (
    select ch.id as charge_id, ch.code as charge_code, ch.amount, ch.area_id, ch.company_id, co.code as company_code,
           s.code as subject_code, pr.collect_pct,
           row_number() over (partition by ch.company_id order by ch.code) as k
    from charges ch
    join charge_requests r on r.id = ch.charge_request_id and r.code = 'YCT-0926-02'
    join companies co on co.id = ch.company_id
    join service_subjects s on s.id = ch.subject_id
    join seed_profile pr on pr.company_code = co.code
    where ch.status = 'UNPAID'
)
select b.*,
       -- Hộ có tài khoản app người dân luôn còn nợ kỳ 09 để thử đóng online (quét QR) trên app.
       case when b.subject_code in ('TTT-H000221', 'NB-H000341') then 'NONE'
            when (b.k * 37) % 100 < b.collect_pct then case when (b.k * 13) % 10 < 6 then 'CASH' else 'TRANSFER' end
            else 'NONE' end as plan,
       (select ca.collector_id from collector_assignments ca
        where ca.area_id = b.area_id and date '2026-09-15' between ca.valid_from and coalesce(ca.valid_to, date '2026-09-15')
        order by ca.id limit 1) as collector_id
from base b;

-- Mã thu tiếp nối TT-0926-000008 của V22_1, đánh số theo thứ tự thời gian như CollectionService.
create temp table seed_pay on commit drop as
select 'TT-0926-' || lpad((8 + row_number() over (order by x.paid_at, x.charge_code))::text, 6, '0') as code,
       8 + row_number() over (order by x.paid_at, x.charge_code) as n, x.*
from (
    select p.charge_id, p.charge_code, p.company_id, p.company_code, p.collector_id, p.subject_code,
           p.plan as method,
           p.amount,
           timestamptz '2026-09-03 08:00+07' + ((p.k * 7) % 21) * interval '1 day'
             + ((p.k * 53) % 600) * interval '1 minute' as paid_at
    from seed_plan p
    where p.plan <> 'NONE'
) x;

insert into payments (code, charge_id, amount, method, paid_at, collector_id, confirmed_by, bank_ref, note,
                      client_request_id)
select p.code, p.charge_id, p.amount, p.method, p.paid_at,
       case when p.method = 'CASH' then p.collector_id end,
       case when p.method = 'CASH' then p.collector_id end,
       case when p.method = 'TRANSFER' then 'FT26' || lpad(p.n::text, 10, '0') end,
       case when p.method = 'TRANSFER' then 'Chuyển khoản qua SePay' end,
       'seed-' || p.code
from seed_pay p;

update charges c set status = 'PAID', paid_at = p.last_paid_at
from (select charge_id, sum(amount) as paid, max(paid_at) as last_paid_at from payments group by charge_id) p
where p.charge_id = c.id and p.paid = c.amount
  and c.charge_request_id = (select id from charge_requests where code = 'YCT-0926-02');

-- Chuyển khoản qua QR đã khớp: ngân hàng báo về đúng mã khoản + đúng số tiền + đúng tài khoản công ty.
insert into bank_transfers (sepay_id, gateway, account_number, transaction_date, amount, content, code, reference_code,
                            status, charge_id, payment_id, company_id)
select 90000000 + p.n, co.bank_name, co.bank_account,
       to_char(p.paid_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS'), p.amount,
       'VSMT' || lpad(p.charge_id::text, 6, '0') || ' Thanh toan phi ve sinh thang 09 2026',
       'VSMT' || lpad(p.charge_id::text, 6, '0'), pay.bank_ref, 'MATCHED', p.charge_id, pay.id, co.id
from seed_pay p
join payments pay on pay.code = p.code
join companies co on co.id = p.company_id
where p.method = 'TRANSFER';

-- Chuyển khoản chờ đối chiếu, mỗi lý do một dòng (màn "Chuyển khoản chờ đối chiếu" của công ty).
-- Không mã khoản: hộ quên ghi nội dung.
insert into bank_transfers (sepay_id, gateway, account_number, transaction_date, amount, content, code, reference_code,
                            status, reason, company_id)
select 90001000 + v.no, co.bank_name, co.bank_account, v.txn, v.amount, v.content, null, 'FT26' || lpad((90001000 + v.no)::text, 10, '0'),
       'UNMATCHED', 'NO_CODE', co.id
from (values
    (1, 'DV05', '2026-09-18 19:02:11', 80000::bigint, 'NGUYEN VAN PHUC chuyen tien rac thang 9'),
    (2, 'DV07', '2026-09-20 08:15:40', 40000::bigint, 'Dong tien ve sinh nha ba Tu')
) as v (no, company_code, txn, amount, content)
join companies co on co.code = v.company_code;

-- Sai số tiền: hộ chuyển 60.000 cho khoản 80.000 nên không tự ghi thanh toán (cần đúng số còn thiếu).
insert into bank_transfers (sepay_id, gateway, account_number, transaction_date, amount, content, code, reference_code,
                            status, reason, charge_id, company_id)
select 90001010, co.bank_name, co.bank_account, '2026-09-21 20:30:05', 60000,
       'VSMT' || lpad(p.charge_id::text, 6, '0') || ' dong tien rac', 'VSMT' || lpad(p.charge_id::text, 6, '0'),
       'FT260090001010', 'UNMATCHED', 'AMOUNT_MISMATCH', p.charge_id, co.id
from companies co,
     lateral (select charge_id from seed_plan where company_code = 'DV03' and plan = 'NONE' and amount = 80000
              order by charge_code limit 1) p
where co.code = 'DV03';

-- Sai tài khoản: khoản của DV05 nhưng tiền chuyển vào tài khoản DV06.
insert into bank_transfers (sepay_id, gateway, account_number, transaction_date, amount, content, code, reference_code,
                            status, reason, charge_id, company_id)
select 90001011, co.bank_name, co.bank_account, '2026-09-22 12:44:19', 80000,
       'VSMT' || lpad(p.charge_id::text, 6, '0'), 'VSMT' || lpad(p.charge_id::text, 6, '0'),
       'FT260090001011', 'UNMATCHED', 'WRONG_ACCOUNT', p.charge_id, co.id
from companies co,
     lateral (select charge_id from seed_plan where company_code = 'DV05' and plan = 'NONE' and amount = 80000
              order by charge_code limit 1) p
where co.code = 'DV06';

-- Khoản đã đóng đủ rồi hộ lại chuyển thêm: không ghi trùng, công ty phải hoàn lại cho hộ.
insert into bank_transfers (sepay_id, gateway, account_number, transaction_date, amount, content, code, reference_code,
                            status, reason, charge_id, company_id)
select 90001012, co.bank_name, co.bank_account, '2026-09-23 07:58:02', p.amount,
       'VSMT' || lpad(p.charge_id::text, 6, '0') || ' dong lai', 'VSMT' || lpad(p.charge_id::text, 6, '0'),
       'FT260090001012', 'UNMATCHED', 'CHARGE_NOT_COLLECTABLE', p.charge_id, co.id
from companies co,
     lateral (select charge_id, amount from seed_pay where company_code = 'DV09' and method = 'CASH'
              order by code limit 1) p
where co.code = 'DV09';

-- 5. Bàn giao tiền mặt và nộp về xã ---------------------------------------------------------------------------------------
-- Công ty nộp đủ thì người đi thu đã bàn giao hết; công ty khác: cách 3 người, một người bàn giao hết, một người nửa
-- số tiền mặt, một người chưa bàn giao (màn Tiền mặt của công ty hiện "đang giữ").

create temp table seed_handover on commit drop as
select pf.collector_id, u.username, u.company_id, co.code as company_code, sum(pf.amount) as cash,
       case when pr.remit_pct = 100 or pf.collector_id % 3 = 0 then sum(pf.amount)
            when pf.collector_id % 3 = 1 then (sum(pf.amount) / 2 / 1000) * 1000
            else 0 end as handed
from seed_pay pf
join users u on u.id = pf.collector_id
join companies co on co.id = u.company_id
join seed_profile pr on pr.company_code = co.code
where pf.method = 'CASH'
group by pf.collector_id, u.username, u.company_id, co.code, pr.remit_pct;

insert into cash_handovers (code, collector_id, company_id, handover_date, amount, note, received_by, created_by)
select 'BG-0926-' || lpad((2 + row_number() over (order by h.company_code, h.username))::text, 2, '0'),
       h.collector_id, h.company_id, date '2026-09-26', h.handed,
       case when h.handed < h.cash then 'Bàn giao một phần, còn lại nộp sau' end, m.id, m.id
from seed_handover h
join users m on m.company_id = h.company_id and m.role = 'COMPANY_MANAGER'
where h.handed > 0;

-- Phải nộp xã của công ty = Σ (số tiền khoản − phần thu gom công ty cầm lại), đúng công thức của CompanyLedgerService.
create temp table seed_receipt on commit drop as
with remit as (
    select co.id as company_id, co.code as company_code, co.contact_name, pr.remit_pct,
           case when pr.remit_pct >= 100 then pay.payable else (pay.payable * pr.remit_pct / 100 / 1000) * 1000 end as total
    from companies co
    join seed_profile pr on pr.company_code = co.code
    join (
        select ch.company_id,
               sum(ch.amount - coalesce(round(ch.amount * t.collection_fee::numeric / nullif(t.monthly_total, 0)), 0))::bigint as payable
        from charges ch
        join collection_periods cp on cp.id = ch.period_id
        left join tariff_rates t on t.tariff_version_id = cp.tariff_version_id and t.tariff_group = ch.tariff_group
        where ch.charge_request_id = (select id from charge_requests where code = 'YCT-0926-02')
        group by ch.company_id
    ) pay on pay.company_id = co.id
),
split as (
    select r.*, case when r.remit_pct >= 80 then (r.total * 6 / 10 / 1000) * 1000 else r.total end as first_amount
    from remit r where r.total > 0
)
select s.company_id, s.company_code, s.contact_name, 1 as seq, s.first_amount as amount, 'TRANSFER' as method,
       date '2026-09-15' + (s.company_id % 8)::int as receipt_date,
       case when s.remit_pct >= 80 then 'Nộp đợt 1' else 'Nộp một phần, hẹn nộp tiếp' end as note
from split s
union all
select s.company_id, s.company_code, s.contact_name, 2, s.total - s.first_amount, 'CASH', date '2026-09-24', 'Nộp đợt 2'
from split s where s.total - s.first_amount > 0;

-- Mã tiếp nối PT-CT-0926-001 của V22_1 (phiếu DV01).
insert into company_receipts (code, company_id, period_id, amount, method, receipt_date, payer_name, document_ref, note,
                              created_by)
select 'PT-CT-0926-' || lpad((1 + row_number() over (order by r.receipt_date, r.company_code, r.seq))::text, 3, '0'),
       r.company_id, p.id, r.amount, r.method, r.receipt_date, r.contact_name,
       case when r.method = 'TRANSFER' then 'UNC-DEMO-' || r.company_code || '-' || r.seq end, r.note, u.id
from seed_receipt r, collection_periods p, users u
where p.code = '2026-09' and u.username = 'canbo_xa';

-- 6. Nhật ký -------------------------------------------------------------------------------------------------------------

insert into audit_logs (occurred_at, actor_user_id, actor_username, actor_role, action, entity_type, entity_id,
                        before_data, after_data)
select a.occurred_at, u.id, a.username, coalesce(u.role, a.role), a.action, a.entity_type, a.entity_id, a.before_data,
       a.after_data
from (
    select timestamptz '2026-09-01 08:05+07' as occurred_at, 'canbo_xa' as username, 'COMMUNE_OFFICER' as role,
           'ISSUE_CHARGE_REQUEST' as action, 'ChargeRequest' as entity_type, 'YCT-0926-02' as entity_id,
           null::jsonb as before_data,
           jsonb_build_object('period', '2026-09', 'feeType', 'ENV', 'scope', 'AREAS',
                              'areas', (select jsonb_agg(a.code order by a.code) from charge_request_areas ra
                                        join areas a on a.id = ra.area_id
                                        where ra.charge_request_id = r.id),
                              'company', null, 'unitPrice', null, 'issueDate', '2026-09-01', 'dueDate', '2026-09-20',
                              'chargeCount', count(*), 'exemptCount', count(*) filter (where c.status = 'EXEMPT'),
                              'totalAmount', sum(c.amount)) as after_data
    from charge_requests r join charges c on c.charge_request_id = r.id
    where r.code = 'YCT-0926-02'
    group by r.id
    union all
    -- Mỗi khoản chỉ một lần thanh toán nên trước đó đã thu 0, như V22_1.
    select p.paid_at,
           case p.method when 'CASH' then cu.username else 'system' end,
           case p.method when 'CASH' then 'COLLECTOR' else 'SYSTEM' end,
           case p.method when 'CASH' then 'RECORD_PAYMENT' else 'RECORD_BANK_TRANSFER' end,
           'Charge', c.code,
           jsonb_build_object('status', 'UNPAID', 'chargeAmount', c.amount, 'paidAmount', 0),
           jsonb_build_object('status', case when p.amount = c.amount then 'PAID' else 'UNPAID' end,
                              'chargeAmount', c.amount, 'paidAmount', p.amount, 'payment', p.code,
                              'paymentAmount', p.amount, 'method', p.method)
    from payments p
    join charges c on c.id = p.charge_id
    left join users cu on cu.id = p.collector_id
    where p.code in (select code from seed_pay)
    union all
    select timestamptz '2026-09-26 17:00+07', m.username, 'COMPANY_MANAGER', 'RECEIVE_CASH_HANDOVER', 'CashHandover',
           h.code, null,
           jsonb_build_object('collector', cu.username, 'amount', h.amount, 'date', h.handover_date,
                              'heldBefore', sh.cash, 'heldAfter', sh.cash - h.amount)
    from cash_handovers h
    join users cu on cu.id = h.collector_id
    join users m on m.id = h.received_by
    join seed_handover sh on sh.collector_id = h.collector_id
    where h.code like 'BG-0926-%' and h.code not in ('BG-0926-01', 'BG-0926-02')
    union all
    select r.receipt_date + time '10:00' at time zone 'Asia/Ho_Chi_Minh', 'canbo_xa', 'COMMUNE_OFFICER',
           'ISSUE_COMPANY_RECEIPT', 'CompanyReceipt', r.code, null,
           jsonb_build_object('company', co.code, 'period', '2026-09', 'amount', r.amount, 'method', r.method,
                              'remainingBefore', pay.payable - coalesce(prev.paid, 0),
                              'remainingAfter', pay.payable - coalesce(prev.paid, 0) - r.amount)
    from company_receipts r
    join companies co on co.id = r.company_id
    join (select company_id, sum(amount - coalesce(round(amount * t.collection_fee::numeric / nullif(t.monthly_total, 0)), 0))::bigint as payable
          from (select ch.company_id, ch.amount, ch.tariff_group, cp.tariff_version_id
                from charges ch join collection_periods cp on cp.id = ch.period_id
                where ch.charge_request_id = (select id from charge_requests where code = 'YCT-0926-02')) x
          left join tariff_rates t on t.tariff_version_id = x.tariff_version_id and t.tariff_group = x.tariff_group
          group by company_id) pay on pay.company_id = r.company_id
    left join lateral (select sum(r2.amount) as paid from company_receipts r2
                       where r2.company_id = r.company_id and r2.period_id = r.period_id and r2.code < r.code) prev on true
    where r.code like 'PT-CT-0926-%' and r.code <> 'PT-CT-0926-001'
) a
left join users u on u.username = a.username
order by a.occurred_at;
