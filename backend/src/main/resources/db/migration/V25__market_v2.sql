-- Chợ đồ cũ v2 (docs/cho-do-cu-spec.md §8, §11): caption + nhiều tag + danh mục + tổ snapshot + ẩn/hiện,
-- liên hệ tự nguyện, lưu bài, chặn, metadata quyền ảnh, chống retry trùng. Không có trường giá (D01).
-- Mở rộng, không xóa: title/description/post_type/pickup_location/photo_urls giữ làm dữ liệu legacy, bỏ NOT NULL.

alter table market_posts
    add column caption             varchar(2500),
    add column category            varchar(30) not null default 'OTHER',
    add column area_id             bigint references areas (id),
    add column hidden              boolean     not null default false,
    add column share_phone         boolean     not null default false,
    add column contact_phone       varchar(15),
    add column client_request_id   uuid,
    add column request_fingerprint varchar(64),
    add column edited_at           timestamptz;

-- Gộp title + hai xuống dòng + mô tả, không cắt (150 + 2 + 2000 ≤ 2500). Không đưa pickup_location vào caption.
-- Tổ = tổ hiện tại của hộ tác giả lúc nâng cấp (không có lịch sử tổ).
update market_posts p
set caption = p.title || E'\n\n' || p.description,
    area_id = s.area_id
from citizen_accounts a join service_subjects s on s.id = a.subject_id
where a.id = p.author_id;

alter table market_posts
    alter column caption set not null,
    alter column area_id set not null,
    alter column title drop not null,
    alter column post_type drop not null,
    alter column description drop not null,
    add constraint ck_market_posts_caption check (btrim(caption) <> ''),
    add constraint ck_market_posts_category check (category in
        ('HOUSEHOLD', 'ELECTRONICS', 'FURNITURE', 'CHILDREN', 'TOOLS_VEHICLES', 'OTHER')),
    add constraint ck_market_posts_phone check (share_phone or contact_phone is null),
    add constraint uq_market_posts_request unique (author_id, client_request_id);

create index ix_market_posts_feed on market_posts (hidden, status, created_at desc, id desc);

create table market_post_tags (
    post_id bigint      not null references market_posts (id),
    tag     varchar(20) not null,
    primary key (post_id, tag),
    constraint ck_market_post_tags_tag check (tag in ('FIND', 'SELL', 'GIVE', 'EXCHANGE'))
);
create index ix_market_post_tags_tag on market_post_tags (tag, post_id);

insert into market_post_tags (post_id, tag) select id, post_type from market_posts where post_type is not null;

alter table market_comments
    add column client_request_id   uuid,
    add column request_fingerprint varchar(64),
    add constraint uq_market_comments_request unique (author_id, client_request_id);

create table market_saved_posts (
    citizen_id bigint      not null references citizen_accounts (id),
    post_id    bigint      not null references market_posts (id),
    created_at timestamptz not null default now(),
    primary key (citizen_id, post_id)
);

create table market_user_blocks (
    blocker_id bigint      not null references citizen_accounts (id),
    blocked_id bigint      not null references citizen_accounts (id),
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id),
    constraint ck_market_user_blocks_self check (blocker_id <> blocked_id)
);
create index ix_market_user_blocks_blocked on market_user_blocks (blocked_id, blocker_id);

-- Metadata quyền ảnh; bytes vẫn ở PhotoStorage. Hàng không bị xóa khi tháo ảnh (post_id = null) để route ảnh cũ
-- /api/citizen/photos/{name} vẫn biết file thuộc chợ.
create table market_images (
    id           bigint generated always as identity primary key,
    storage_name varchar(64) not null,
    uploader_id  bigint references citizen_accounts (id),
    post_id      bigint references market_posts (id),
    sort_order   integer     not null default 0,
    legacy       boolean     not null default false,
    created_at   timestamptz not null default now(),
    constraint uq_market_images_post_name unique (post_id, storage_name)
);
create index ix_market_images_name on market_images (storage_name);
create index ix_market_images_uploader on market_images (uploader_id, created_at);

-- Ảnh cũ: legacy, không biết người tải lên thật (uploader_id null).
insert into market_images (storage_name, post_id, sort_order, legacy, created_at)
select distinct on (p.id, x.name) x.name, p.id, x.ord - 1, true, p.created_at
from market_posts p
cross join lateral unnest(string_to_array(p.photo_urls, E'\n')) with ordinality as x(name, ord)
where p.photo_urls is not null and x.name <> ''
order by p.id, x.name, x.ord;
