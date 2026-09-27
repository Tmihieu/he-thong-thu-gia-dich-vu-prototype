-- T47 · citizen-app · MarketPost, MarketComment (docs/data-dictionary.md §3.4)
-- Không kiểm duyệt (O6); người đăng tự đóng bài (D9). Người đăng / người bình luận là tài khoản người dân,
-- nên created_by / updated_by để trống.
-- photo_urls: tên file ảnh trong thư mục upload (PhotoStorage), mỗi dòng một tên; URL dựng ở API.

create table market_posts (
    id               bigint generated always as identity primary key,
    code             varchar(20)   not null,
    author_id        bigint        not null references citizen_accounts (id),
    title            varchar(150)  not null,
    post_type        varchar(30)   not null,
    description      varchar(2000) not null,
    photo_urls       text,
    pickup_location  varchar(255),
    status           varchar(30)   not null default 'OPEN',

    created_at       timestamptz   not null default now(),
    created_by       bigint references users (id),
    updated_at       timestamptz   not null default now(),
    updated_by       bigint references users (id),
    version          integer       not null default 0,

    constraint uq_market_posts_code unique (code),
    constraint ck_market_posts_type check (post_type in ('GIVE', 'EXCHANGE')),
    constraint ck_market_posts_status check (status in ('OPEN', 'CLOSED'))
);

create index ix_market_posts_list on market_posts (status, created_at desc, id desc);
create index ix_market_posts_author on market_posts (author_id);

create table market_comments (
    id          bigint generated always as identity primary key,
    post_id     bigint        not null references market_posts (id),
    author_id   bigint        not null references citizen_accounts (id),
    content     varchar(1000) not null,

    created_at  timestamptz   not null default now(),
    created_by  bigint references users (id),
    updated_at  timestamptz   not null default now(),
    updated_by  bigint references users (id),
    version     integer       not null default 0
);

create index ix_market_comments_post on market_comments (post_id, created_at, id);
