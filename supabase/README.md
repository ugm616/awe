# AWE + Supabase (multi-user) — setup in ~10 min

You chose **Supabase + Admin/Editor/Viewer**. The site already works without it (localStorage fallback). Fill in keys to go multi-user.

## 1. Create project
1. Go to https://supabase.com → New project → free tier
2. Project Settings → API → copy:
   - `Project URL`
   - `anon public` key
3. Open `awe website/js/supabase-config.js` and paste them:
```js
window.AWE_SUPABASE_URL = 'https://xyz.supabase.co';
window.AWE_SUPABASE_ANON_KEY = 'eyJ...';
```

## 2. Create tables
1. Supabase Dashboard → SQL Editor → New query
2. Paste entire `supabase/schema.sql` → Run
3. Table Editor → verify `profiles`, `site_content`, `posts` exist

## 3. Auth
1. Authentication → Providers → enable Email
2. Authentication → Users → Add user (your admin email + password)
3. Table Editor → `profiles` → find your user → set `role = admin`
4. Invite others: add users, set role to `editor` or `viewer`

Roles:
- `admin` — menus, hero, design, posts, users, everything
- `editor` — news posts + top stories + featured video only
- `viewer` — read-only (can log into admin but cannot save)

## 4. Migrate local content (optional)
1. Open `admin.html` locally (old password `aweadmin`) → Export JSON
2. After Supabase login as admin → Import JSON → Save all → pushes to cloud
3. Front page (`index.html`) now loads shared cloud copy for everyone

## 5. Storage for images (optional but recommended)
1. Storage → New bucket `awe-media` → Public ON
2. Admin → Design → paste public image URLs, or upload in Storage and copy URL
3. Logo: upload `awe-logo.png` → copy public URL → paste in Design → Logo

## How it works
- No keys? → localStorage single-user mode (current behaviour)
- Keys present? → front loads `site_content id=1` + `posts` from Supabase; admin uses Supabase Auth + RLS
- RLS enforces roles server-side, so editors cannot overwrite menus even if they try via console

## Files added
- `supabase/schema.sql`
- `js/supabase-config.js` (your keys — do not commit to public repo if site is private; anon key is public-safe with RLS on)
- `js/cms-supabase.js` (client helpers)
- `SUPABASE_SETUP.md` (this file)
