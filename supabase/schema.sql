-- AWE multi-user CMS — Supabase schema
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- 1. Profiles (role per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz default now()
);

-- 2. Shared site content (singleton row id=1: menus, hero, top stories, design)
create table if not exists public.site_content (
  id int primary key,
  data jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now()
);

-- 3. News posts (shared, multi-author)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  category text default 'News',
  title text not null,
  excerpt text default '',
  image text default '',
  date date default current_date,
  video_url text default '',
  body text default '',
  published boolean default true,
  author_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_posts_updated on public.posts;
create trigger trg_posts_updated before update on public.posts
for each row execute function public.handle_updated_at();

-- auto-create profile on signup (default viewer; promote first user to admin manually)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- 4. Enable RLS
alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.posts enable row level security;

-- profiles: users read all, users update own row, admins manage all (recursion-safe)
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "profiles admin manage" on public.profiles;
create policy "profiles admin manage" on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- site_content: everyone (incl anon) can read; only admins/editors can write
-- role check via profiles table (non-recursive: profiles readable by authenticated)
drop policy if exists "site read" on public.site_content;
create policy "site read" on public.site_content for select using (true);

drop policy if exists "site write editor+" on public.site_content;
create policy "site write editor+" on public.site_content for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);

-- posts: public read published; authenticated read all; editors+ write
drop policy if exists "posts public read" on public.posts;
create policy "posts public read" on public.posts for select using (published = true);

drop policy if exists "posts auth read" on public.posts;
create policy "posts auth read" on public.posts for select to authenticated using (true);

drop policy if exists "posts write editor+" on public.posts;
create policy "posts write editor+" on public.posts for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);

-- 5. Seed site_content id=1 (run once; app also auto-seeds if missing)
-- Replace DATA below with your Export JSON from admin if migrating from localStorage.
-- insert into public.site_content (id, data) values (1, '{}'::jsonb)
-- on conflict (id) do nothing;
