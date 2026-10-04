-- Seed demo (chỉ profile demo): kỳ CŨ 09/2026 đang thu, đã quá hạn công ty nộp xã, DV01 còn nợ. Nhắc nộp (§10 bước 5,
-- R16) chỉ lập được khi có kỳ hạn nộp trước hôm nay mà công ty còn phải nộp > 0; hạn 25/09/2026 đã qua cả lúc làm seed
-- (28/09) lẫn ngày demo (21/10). Kỳ 10/2026 không seed: §10 bước 1 mở kỳ đó.
-- Chỉ phát hành cho DV01 (phạm vi công ty, KV07 + KV09): công ty khác không có nợ kỳ trước ở kỳ 10/2026.
-- Số liệu theo quy tắc của service: khoản chụp công ty theo phân công ngày phát hành 01/09 (G3), đơn giá tháng của
-- nhóm giá theo BG-65-2026 là biểu giá hiệu lực ngày đầu kỳ (R1); khoản Đã thu khi Σ thanh toán = số tiền (G4);
-- người đi thu đã bàn giao hết tiền mặt (R21); xã lập một phiếu thu một phần (R15).
-- DV01: phải thu 1.319.000 (19 khoản), đã thu 609.000 (8 lần), đã nộp 400.000, còn phải nộp 919.000.
-- Seed chỉ ghi dữ liệu tiền và nhật ký, không tạo thông báo như lúc chạy thật (vd. RECEIPT gửi DV01 khi lập phiếu thu).

insert into collection_periods (code, period_type, label, start_date, end_date, open_date, due_date,
                                tariff_version_id, status, note, created_by)
select '2026-09', 'MONTH', 'Tháng 09/2026', date '2026-09-01', date '2026-09-30', date '2026-09-01',
       date '2026-09-25', v.id, 'COLLECTING', 'Seed demo: kỳ cũ đã quá hạn nộp', u.id
from tariff_versions v join users u on u.username = 'admin'
where v.code = 'BG-65-2026';

insert into charge_requests (code, period_id, fee_type_id, scope_type, scope_company_id, issue_date, due_date,
                             created_by)
select 'YCT-0926-01', p.id, f.id, 'COMPANY', c.id, date '2026-09-01', date '2026-09-20', u.id
from collection_periods p, fee_types f, companies c, users u
where p.code = '2026-09' and f.code = 'ENV' and c.code = 'DV01' and u.username = 'canbo_xa';

-- Như ChargeEligibility: đối tượng đang cung cấp dịch vụ, hợp đồng hiệu lực và tổ có công ty tại ngày phát hành.
insert into charges (code, charge_request_id, subject_id, contract_id, period_id, fee_type_id, area_id, company_id,
                     tariff_group, unit_price, months, amount, coverage_from, coverage_to, due_date, status)
select 'KT-0926-' || s.code, r.id, s.id, k.id, p.id, r.fee_type_id, s.area_id, aa.company_id, k.tariff_group,
       t.monthly_total, 1, case when k.exempt then 0 else t.monthly_total end, p.start_date, p.end_date, r.due_date,
       case when k.exempt then 'EXEMPT' else 'UNPAID' end
from charge_requests r
join collection_periods p on p.id = r.period_id
join area_assignments aa on aa.company_id = r.scope_company_id
    and r.issue_date between aa.valid_from and coalesce(aa.valid_to, r.issue_date)
join service_subjects s on s.area_id = aa.area_id and s.status = 'ACTIVE'
join service_contracts k on k.subject_id = s.id
    and r.issue_date between k.valid_from and coalesce(k.valid_to, r.issue_date)
join tariff_rates t on t.tariff_version_id = p.tariff_version_id and t.tariff_group = k.tariff_group
where r.code = 'YCT-0926-01';

-- Mã theo thứ tự thời gian như CollectionService; DTH-H000125 thu một phần, DTH-H000122 vắng một lần rồi mới thu.
insert into payments (code, charge_id, amount, method, paid_at, collector_id, confirmed_by, bank_ref, note,
                      client_request_id)
select v.code, c.id, v.amount, v.method, v.paid_at, u.id, u.id, v.bank_ref, v.note, 'seed-' || v.code
from (values
    ('TT-0926-000001', 'DTH-H000121',  80000, 'CASH',     timestamptz '2026-09-05 17:20+07', 'thu07', null, null),
    ('TT-0926-000002', 'DTH-H000123',  40000, 'TRANSFER', timestamptz '2026-09-05 17:45+07', 'thu07', 'FT-DEMO-0001', null),
    ('TT-0926-000003', 'TTT-H000161',  80000, 'CASH',     timestamptz '2026-09-07 18:20+07', 'thu09', null, null),
    ('TT-0926-000004', 'DTH-H000128',  80000, 'CASH',     timestamptz '2026-09-08 17:30+07', 'thu07', null, null),
    ('TT-0926-000005', 'DTH-H000125',  50000, 'CASH',     timestamptz '2026-09-08 17:50+07', 'thu07', null,
     'Hộ đóng trước một phần, hẹn đóng nốt'),
    ('TT-0926-000006', 'TTT-KD00009', 119000, 'TRANSFER', timestamptz '2026-09-09 10:00+07', 'thu09', 'FT-DEMO-0002', null),
    ('TT-0926-000007', 'DTH-H000122',  80000, 'CASH',     timestamptz '2026-09-10 18:10+07', 'thu07', null, null),
    ('TT-0926-000008', 'TTT-H000162',  80000, 'CASH',     timestamptz '2026-09-11 18:40+07', 'thu09', null, null)
) as v (code, subject_code, amount, method, paid_at, collector, bank_ref, note)
join charges c on c.code = 'KT-0926-' || v.subject_code
join users u on u.username = v.collector;

update charges c set status = 'PAID', paid_at = p.last_paid_at
from (select charge_id, sum(amount) as paid, max(paid_at) as last_paid_at from payments group by charge_id) p
where p.charge_id = c.id and p.paid = c.amount and c.code like 'KT-0926-%';

insert into collection_visits (charge_id, result, visited_at, revisit_date, note, recorded_by, client_request_id)
select c.id, v.result, v.visited_at, v.revisit_date, v.note, u.id, 'seed-' || v.request_id
from (values
    ('LG-0926-1', 'DTH-H000122', 'ABSENT',      timestamptz '2026-09-08 17:40+07', null::date,        'Vắng nhà, để giấy báo'),
    ('LG-0926-2', 'DTH-H000124', 'APPOINTMENT', timestamptz '2026-09-08 18:00+07', date '2026-09-12', 'Hộ hẹn cuối tuần')
) as v (request_id, subject_code, result, visited_at, revisit_date, note)
join charges c on c.code = 'KT-0926-' || v.subject_code
join users u on u.username = 'thu07';

-- Bàn giao đúng số tiền mặt từng người đã thu (thu07: 290.000, thu09: 160.000), nên không ai còn giữ tiền kỳ cũ.
insert into cash_handovers (code, collector_id, company_id, handover_date, amount, received_by, created_by)
select v.code, u.id, u.company_id, date '2026-09-12', sum(p.amount), m.id, m.id
from (values ('BG-0926-01', 'thu07'), ('BG-0926-02', 'thu09')) as v (code, collector)
join users u on u.username = v.collector
join payments p on p.collector_id = u.id and p.method = 'CASH' and p.code like 'TT-0926-%'
join users m on m.username = 'dv01'
group by v.code, u.id, u.company_id, m.id;

insert into company_receipts (code, company_id, period_id, amount, method, receipt_date, payer_name, document_ref,
                              note, created_by)
select 'PT-CT-0926-001', c.id, p.id, 400000, 'TRANSFER', date '2026-09-22', c.contact_name, 'UNC-DEMO-0922',
       'Nộp đợt 1', u.id
from companies c, collection_periods p, users u
where c.code = 'DV01' and p.code = '2026-09' and u.username = 'canbo_xa';

-- Nhật ký cho các thao tác trên, cùng action/entity/khóa JSON như service ghi (tiền phải có audit).
insert into audit_logs (occurred_at, actor_user_id, actor_username, actor_role, action, entity_type, entity_id,
                        before_data, after_data)
select a.occurred_at, u.id, u.username, u.role, a.action, a.entity_type, a.entity_id, a.before_data, a.after_data
from (
    select timestamptz '2026-08-28 09:00+07' as occurred_at, 'admin' as username, 'OPEN_PERIOD' as action,
           'CollectionPeriod' as entity_type, '2026-09' as entity_id, null::jsonb as before_data,
           jsonb_build_object('code', '2026-09', 'type', 'MONTH', 'startDate', '2026-09-01', 'endDate', '2026-09-30',
                              'openDate', '2026-09-01', 'dueDate', '2026-09-25', 'tariffVersion', 'BG-65-2026',
                              'status', 'COLLECTING') as after_data
    union all
    select timestamptz '2026-09-01 08:00+07', 'canbo_xa', 'ISSUE_CHARGE_REQUEST', 'ChargeRequest', 'YCT-0926-01', null,
           jsonb_build_object('period', '2026-09', 'feeType', 'ENV', 'scope', 'COMPANY',
                              'areas', '[]'::jsonb, 'company', 'DV01', 'unitPrice', null,
                              'issueDate', '2026-09-01', 'dueDate', '2026-09-20',
                              'chargeCount', count(*), 'exemptCount', count(*) filter (where status = 'EXEMPT'),
                              'totalAmount', sum(amount))
    from charges where code like 'KT-0926-%'
    union all
    -- Mỗi khoản chỉ một lần thanh toán nên trước đó đã thu 0; khóa như CollectionService.state + số tiền lần thu.
    select p.paid_at, cu.username, 'RECORD_PAYMENT', 'Charge', c.code,
           jsonb_build_object('status', 'UNPAID', 'chargeAmount', c.amount, 'paidAmount', 0),
           jsonb_build_object('status', case when p.amount = c.amount then 'PAID' else 'UNPAID' end,
                              'chargeAmount', c.amount, 'paidAmount', p.amount, 'payment', p.code,
                              'paymentAmount', p.amount, 'method', p.method)
    from payments p join charges c on c.id = p.charge_id join users cu on cu.id = p.collector_id
    where p.code like 'TT-0926-%'
    union all
    select timestamptz '2026-09-12 17:00+07', 'dv01', 'RECEIVE_CASH_HANDOVER', 'CashHandover', h.code, null,
           jsonb_build_object('collector', cu.username, 'amount', h.amount, 'date', h.handover_date,
                              'heldBefore', h.amount, 'heldAfter', 0)
    from cash_handovers h join users cu on cu.id = h.collector_id
    where h.code like 'BG-0926-%'
    union all
    select timestamptz '2026-09-22 10:00+07', 'canbo_xa', 'ISSUE_COMPANY_RECEIPT', 'CompanyReceipt', r.code, null,
           jsonb_build_object('company', 'DV01', 'period', '2026-09', 'amount', r.amount, 'method', r.method,
                              'remainingBefore', d.due, 'remainingAfter', d.due - r.amount)
    from company_receipts r, (select sum(amount) as due from charges where code like 'KT-0926-%') d
    where r.code = 'PT-CT-0926-001'
) a
join users u on u.username = a.username
order by a.occurred_at;
