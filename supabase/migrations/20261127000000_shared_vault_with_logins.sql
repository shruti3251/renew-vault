-- RenewalVault: one shared vault, usable only by signed-in RenewalVault users.
-- Users are created by an admin through the `admin-users` edge function.

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'Portal users. Written only by the admin-users edge function (service role).';

alter table public.profiles enable row level security;

-- The signed-in user's role, or null if they are not a portal user.
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where user_id = (select auth.uid());
$$;
revoke execute on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;

-- Users see their own profile; admins see everyone. No direct writes.
create policy "profiles: read own, admins read all" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.my_role()) = 'admin');
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- ------------------------------------------------------------------- items
-- Each row is one document; the item body is JSON (see src/utils/storage.js).
create table public.items (
  id text primary key check (char_length(id) between 1 and 64),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 32768),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

alter table public.items enable row level security;

create policy "items: members read" on public.items
  for select to authenticated using ((select public.my_role()) is not null);
create policy "items: members insert" on public.items
  for insert to authenticated with check ((select public.my_role()) is not null);
create policy "items: members update" on public.items
  for update to authenticated
  using ((select public.my_role()) is not null)
  with check ((select public.my_role()) is not null);
create policy "items: members delete" on public.items
  for delete to authenticated using ((select public.my_role()) is not null);

revoke all on public.items from anon, authenticated;
grant select, insert, update, delete on public.items to authenticated;

-- Record who made each change.
create or replace function public.items_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;
create trigger items_stamp before insert or update on public.items
  for each row execute function public.items_stamp();

-- Push changes to open browsers instantly.
alter publication supabase_realtime add table public.items;

-- This project does not auto-grant new tables, so the edge function's
-- service role needs explicit access too.
grant all on public.profiles, public.items to service_role;
