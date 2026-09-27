-- Rumble on-demand cache — run after schema.sql
create table if not exists public.rumble_videos (
  id text primary key, -- rumble video id e.g. v6x1abc
  page_url text not null,
  embed_url text not null,
  title text default '',
  thumbnail text default '',
  duration int default 0,
  published_at timestamptz,
  is_live boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_rumble_updated on public.rumble_videos;
create trigger trg_rumble_updated before update on public.rumble_videos
for each row execute function public.handle_updated_at();

alter table public.rumble_videos enable row level security;

-- public read (on-demand pages are public, ads stay in official embeds)
drop policy if exists "rumble public read" on public.rumble_videos;
create policy "rumble public read" on public.rumble_videos for select using (true);

-- editors+ write (daily sync uses service_role, bypasses RLS; admins can also edit manually)
drop policy if exists "rumble write editor+" on public.rumble_videos;
create policy "rumble write editor+" on public.rumble_videos for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);
