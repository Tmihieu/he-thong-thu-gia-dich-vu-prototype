-- T07 · platform · AuditLog (docs/data-dictionary.md §2.1)
-- Nhật ký thao tác tạo/sửa tiền và thao tác quản trị. Chỉ thêm, không sửa, không xóa.

create table audit_logs (
    id              bigint generated always as identity primary key,
    occurred_at     timestamptz  not null default now(),
    actor_user_id   bigint references users (id),
    actor_username  varchar(50)  not null,
    actor_role      varchar(30)  not null,
    action          varchar(60)  not null,
    entity_type     varchar(40)  not null,
    entity_id       varchar(40)  not null,
    before_data     jsonb,
    after_data      jsonb,
    ip_address      varchar(45)
);

create index ix_audit_logs_entity on audit_logs (entity_type, entity_id);
create index ix_audit_logs_occurred_at on audit_logs (occurred_at);

comment on table audit_logs is 'Nhật ký thao tác; chỉ INSERT';
comment on column audit_logs.actor_username is 'Chụp lại lúc ghi; system khi tác vụ tự động; citizen:<sđt> khi người dân';

create function audit_logs_append_only() returns trigger
language plpgsql as $$
begin
    raise exception 'audit_logs chỉ được thêm, không được sửa hoặc xóa';
end;
$$;

create trigger trg_audit_logs_append_only
    before update or delete on audit_logs
    for each row execute function audit_logs_append_only();
