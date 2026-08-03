/* Browser Supabase client — only active when env vars are set. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

/** Strip accidental quotes / BOM that Vercel UI paste often leaves in. */
function cleanEnv(value: string | undefined): string {
  return (value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function supabaseUrl(): string {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Prefer classic anon JWT; fall back to new publishable key. */
function supabaseKey(): string {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    ''
  );
}

export function isCloudSyncEnabled(): boolean {
  return Boolean(supabaseUrl() && supabaseKey());
}

/** Returns null when cloud sync is not configured (local-only mode). */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) {
    client = null;
    return null;
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
