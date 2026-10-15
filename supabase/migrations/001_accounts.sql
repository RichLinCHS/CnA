-- Run once in the Supabase SQL editor. No service-role key is needed by the app.
create table public.learning_backups (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 data jsonb not null check (octet_length(data::text) <= 2100000)
);
create index learning_backups_user_created on public.learning_backups(user_id, created_at desc);
alter table public.learning_backups enable row level security;
revoke all on public.learning_backups from anon, authenticated;
grant select, insert on public.learning_backups to authenticated;
create policy "Read own backups" on public.learning_backups for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own backups" on public.learning_backups for insert to authenticated with check ((select auth.uid()) = user_id);
-- Immutable snapshots avoid silently overwriting another device's work.
