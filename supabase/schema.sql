-- TOA cloud KV store — run once in Supabase SQL Editor.
-- Maps 1:1 to browser localStorage keys (JSON blobs).

create table if not exists public.app_kv (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.app_kv_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_kv_set_updated_at on public.app_kv;
create trigger app_kv_set_updated_at
  before update on public.app_kv
  for each row
  execute function public.app_kv_touch_updated_at();

-- Prototype: open read/write for anon key (shared demo room).
-- Tighten RLS before any production use.
alter table public.app_kv enable row level security;

drop policy if exists "app_kv_anon_all" on public.app_kv;
create policy "app_kv_anon_all"
  on public.app_kv
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Realtime: Dashboard → Database → Publications → supabase_realtime
-- OR run:
alter publication supabase_realtime add table public.app_kv;
