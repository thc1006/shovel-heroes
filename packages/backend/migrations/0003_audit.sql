-- Append-only audit table with trigger
create table if not exists audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  table_name text not null,
  op text not null,
  row_id text,
  actor uuid,
  diff jsonb
);

create or replace function app.audit_trigger() returns trigger language plpgsql as $$
begin
  insert into audit_log(table_name, op, row_id, actor, diff)
  values (TG_TABLE_NAME, TG_OP, coalesce(NEW::text, OLD::text), app.current_user_id(), 
          case when TG_OP='INSERT' then to_jsonb(NEW)
               when TG_OP='UPDATE' then jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
               else to_jsonb(OLD) end);
  return coalesce(NEW, OLD);
end;
$$;

-- Example: add trigger to grids
drop trigger if exists audit_grids on grids;
create trigger audit_grids after insert or update or delete on grids
for each row execute function app.audit_trigger();
