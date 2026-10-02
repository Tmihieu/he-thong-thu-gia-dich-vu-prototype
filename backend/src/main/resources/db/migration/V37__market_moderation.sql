-- Chợ đồ cũ: kiểm duyệt bởi cán bộ xã (thay D05/O6 "không kiểm duyệt").
-- Bài khớp từ khóa lọc → chờ duyệt, không lên feed; người dân báo cáo bài → cán bộ xã xem lại (giữ hoặc gỡ).
-- Bài cũ coi như đã duyệt.

alter table market_posts
    add column moderation      varchar(20)  not null default 'PUBLISHED',
    add column moderation_note varchar(500),
    add column moderated_at    timestamptz,
    add column moderated_by    bigint references users (id),
    add constraint ck_market_posts_moderation check (moderation in ('PUBLISHED', 'PENDING_REVIEW', 'REJECTED'));

drop index ix_market_posts_feed;
create index ix_market_posts_feed on market_posts (moderation, hidden, status, created_at desc, id desc);

create table market_post_reports (
    id          bigint generated always as identity primary key,
    post_id     bigint       not null references market_posts (id),
    reporter_id bigint       not null references citizen_accounts (id),
    reason      varchar(20)  not null,
    note        varchar(500),
    created_at  timestamptz  not null default now(),
    resolved_at timestamptz,
    resolved_by bigint references users (id),
    resolution  varchar(20),
    constraint ck_market_post_reports_reason check (reason in ('SPAM', 'PROHIBITED', 'SCAM', 'OFFENSIVE', 'OTHER')),
    constraint ck_market_post_reports_resolution check (resolution in ('KEPT', 'REMOVED')),
    constraint ck_market_post_reports_resolved check ((resolved_at is null) = (resolution is null))
);
-- Mỗi người chỉ một báo cáo đang mở cho một bài.
create unique index uq_market_post_reports_open on market_post_reports (post_id, reporter_id) where resolved_at is null;
create index ix_market_post_reports_post on market_post_reports (post_id, resolved_at);

create table market_filter_keywords (
    id         bigint generated always as identity primary key,
    keyword    varchar(100) not null,
    created_at timestamptz  not null default now(),
    created_by bigint references users (id),
    constraint ck_market_filter_keywords_blank check (btrim(keyword) <> '')
);
create unique index uq_market_filter_keywords on market_filter_keywords (lower(keyword));

insert into market_filter_keywords (keyword) values
    ('ma túy'), ('cần sa'), ('thuốc lá điện tử'), ('vape'), ('pháo'), ('vũ khí'), ('súng'),
    ('lô đề'), ('cá độ'), ('đánh bạc'), ('vay tiền'), ('cho vay'), ('bốc họ'), ('động vật hoang dã');
