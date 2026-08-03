/* Browser Supabase client — only active when env vars are set. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
}

/** Prefer classic anon JWT; fall back to new publishable key. */
function supabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
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
