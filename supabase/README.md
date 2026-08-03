# Supabase cloud KV sync (optional)

When `NEXT_PUBLIC_SUPABASE_URL` plus either `NEXT_PUBLIC_SUPABASE_ANON_KEY`
or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set, the app dual-writes shared
`localStorage` keys to Supabase table `app_kv` and hydrates from the cloud on
boot. Leave them empty for classic local-only mode.

## 1. Create a Supabase project

1. Open https://supabase.com → New project
2. Wait until the database is ready

## 2. Create the table

1. Supabase Dashboard → **SQL Editor** → New query
2. Paste and run the full contents of `schema.sql` in this folder
3. Confirm table `public.app_kv` exists under **Table Editor**

## 3. Enable Realtime (if the SQL `alter publication` failed)

1. **Database** → **Publications** → `supabase_realtime`
2. Ensure `app_kv` is listed / toggled on

## 4. Add env vars locally

1. **Project Settings** → **General** / **Connect** → Project URL  
2. **API Keys** → Publishable key *or* Legacy **anon** key  
3. Create project-root `.env.local` (see `env.example`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# or: NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 5. Restart the app

```bash
npm run dev
```

First browser to load will **seed** cloud from its localStorage if `app_kv` is empty.
Later browsers **hydrate** from cloud; Realtime mirrors remote writes into localStorage
(without auto page reload, to avoid sync loops). Refresh the page to re-read shared data.

## Security note

RLS policy in `schema.sql` allows open anon read/write — fine for an internal
prototype “shared room”, not for production PII.
