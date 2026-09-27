-- Người dùng chốt 28/09/2026: mở kỳ là bắt đầu thu luôn, bỏ trạng thái "Đã mở" (OPEN) và bước "Bắt đầu thu".
-- Kỳ đang OPEN trên CSDL cũ chuyển sang Đang thu để khóa kỳ (chỉ từ Đang thu) vẫn làm được.

update collection_periods set status = 'COLLECTING' where status = 'OPEN';

alter table collection_periods alter column status set default 'COLLECTING';
alter table collection_periods drop constraint ck_collection_periods_status;
alter table collection_periods add constraint ck_collection_periods_status check (status in ('COLLECTING', 'LOCKED'));
