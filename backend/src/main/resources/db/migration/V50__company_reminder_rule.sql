create table company_reminder_rule (
    id integer primary key check (id = 1),
    enabled boolean not null default false,
    days_before_due integer not null default 3 check (days_before_due between 0 and 365),
    repeat_every_days integer not null default 3 check (repeat_every_days between 1 and 365)
);

insert into company_reminder_rule (id) values (1);

create table company_reminder_deliveries (
    company_id bigint not null references companies (id),
    period_id bigint not null references collection_periods (id),
    sent_on date not null,
    amount bigint not null check (amount > 0),
    primary key (company_id, period_id, sent_on)
);
