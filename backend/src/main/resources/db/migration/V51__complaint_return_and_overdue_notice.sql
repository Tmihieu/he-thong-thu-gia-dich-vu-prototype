-- Khiếu nại: công ty trả lại xã (RETURNED) khi bị chuyển nhầm, và đánh dấu đã báo quá hạn để job nhắc mỗi khiếu nại một lần.
alter table complaint_events drop constraint ck_complaint_events_type;
alter table complaint_events add constraint ck_complaint_events_type check (event_type in
    ('SUBMITTED', 'RECEIVED', 'FORWARDED', 'COMPANY_REPLIED', 'RETURNED', 'CLOSED'));

alter table complaints add column overdue_notified_at timestamptz;
