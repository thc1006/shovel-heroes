-- Users and grids (minimal)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text,
  display_name text
);

create table if not exists grids (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area_id text
);

-- app.user_id GUC
create schema if not exists app;
create or replace function app.current_user_id() returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

-- Minimal seed
