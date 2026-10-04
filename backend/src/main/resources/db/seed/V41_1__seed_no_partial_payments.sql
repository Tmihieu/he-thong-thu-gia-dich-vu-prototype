-- Seed demo: không còn thu một phần (hộ chỉ Đã đóng / Chưa đóng). Hộ đã đóng trước một phần ở V22_1 / V40_3 coi như
-- đóng đủ ngay lần thu đó: cộng phần còn thiếu vào lần thu gần nhất, khoản chuyển Đã thu. Người đi thu đã bàn giao hết
-- tiền mặt thì phiếu bàn giao gần nhất cũng cộng phần đó, để tiền đang giữ vẫn là 0 (R21). Nhật ký chỉ ghi thêm
-- (audit_logs không cho sửa) nên các dòng cũ giữ số tiền lúc ghi.

create temporary table seed_topup on commit drop as
select distinct on (p.charge_id) p.id as payment_id, p.code, p.method, p.collector_id, x.missing, x.charge_amount
from payments p
join (
    select c.id as charge_id, c.amount as charge_amount, c.amount - sum(p.amount) as missing
    from charges c join payments p on p.charge_id = c.id
    where c.status = 'UNPAID'
    group by c.id, c.amount
    having sum(p.amount) > 0 and sum(p.amount) < c.amount
) x on x.charge_id = p.charge_id
where p.amount > 0
order by p.charge_id, p.paid_at desc, p.id desc;

-- Tiền mặt đang giữ của người đi thu TRƯỚC khi cộng (0 = đã bàn giao hết).
create temporary table seed_topup_collector on commit drop as
select t.collector_id, sum(t.missing) as extra,
       (select max(h.id) from cash_handovers h where h.collector_id = t.collector_id) as last_handover_id,
       coalesce((select sum(p.amount) from payments p where p.collector_id = t.collector_id and p.method = 'CASH'), 0)
       - coalesce((select sum(h.amount) from cash_handovers h where h.collector_id = t.collector_id), 0) as held
from seed_topup t
where t.method = 'CASH' and t.collector_id is not null
group by t.collector_id;

update payments p set amount = p.amount + t.missing,
    note = case when p.note = 'Hộ đóng trước một phần, hẹn đóng nốt' then null else p.note end
from seed_topup t
where t.payment_id = p.id;

update charges c set status = 'PAID', paid_at = p.last_paid_at
from (select charge_id, sum(amount) as paid, max(paid_at) as last_paid_at from payments group by charge_id) p
where p.charge_id = c.id and c.status = 'UNPAID' and p.paid = c.amount;

update cash_handovers h set amount = h.amount + s.extra
from seed_topup_collector s
where s.held = 0 and s.last_handover_id = h.id;
