-- LOVABLE admin: visit analytics (page views + sessions)
-- Run this once in the Supabase SQL Editor for this project
-- (Project Settings > SQL Editor > New query > paste > Run).

create table if not exists public.analytics_sessions (
  id text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  entry_path text
);

create table if not exists public.analytics_pageviews (
  id bigint generated always as identity primary key,
  session_id text not null references public.analytics_sessions(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_pageviews_created_at_idx on public.analytics_pageviews (created_at);
create index if not exists analytics_pageviews_path_idx on public.analytics_pageviews (path);
create index if not exists analytics_sessions_first_seen_idx on public.analytics_sessions (first_seen);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_pageviews enable row level security;

-- visitors (anon key, from the storefront) can write their own analytics rows,
-- but can never read analytics data back
create policy "anon can insert sessions" on public.analytics_sessions
  for insert to anon with check (true);
create policy "anon can update sessions" on public.analytics_sessions
  for update to anon using (true) with check (true);
create policy "anon can insert pageviews" on public.analytics_pageviews
  for insert to anon with check (true);

-- only a logged-in admin can read analytics data, for the Insights page
create policy "admin can read sessions" on public.analytics_sessions
  for select to authenticated using (true);
create policy "admin can read pageviews" on public.analytics_pageviews
  for select to authenticated using (true);
